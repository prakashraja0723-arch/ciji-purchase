'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Title,
  Text,
  Container,
  Paper,
  Stack,
  Group,
  Button,
  Table,
  TextInput,
  ActionIcon,
  Modal,
  Loader,
  Center,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconFileSpreadsheet,
  IconUpload,
  IconX, IconBuildingStore,
} from '@tabler/icons-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';

interface SupplierItem {
  id: string;
  vendorName: string;
  trn: string;
  createdAt?: Timestamp;
}

interface FormValues {
  vendorName: string;
  trn: string;
}

export default function SupplierManagementPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search filter
  const [search, setSearch] = useState('');
  
  // Modals State
  const [opened, { open: openItemModal, close: closeItemModal }] = useDisclosure(false);
  const [bulkOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);
  
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  
  // Mantine useForm Hook setup for Suppliers
  const form = useForm<FormValues>({
    initialValues: {
      vendorName: '',
      trn: '',
    },
    validate: {
      vendorName: (value) => (value.trim().length < 2 ? 'Vendor name is required' : null),
      trn: (value) => (value.trim().length < 2 ? 'TRN is required' : null),
    },
  });
  
  // Fetch Suppliers from Firestore
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suppliers'), orderBy('vendorName', 'asc'));
      const querySnapshot = await getDocs(q);
      const loadedSuppliers: SupplierItem[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SupplierItem, 'id'>),
      }));
      setSuppliers(loadedSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchSuppliers().catch((err) => console.error('Failed to load suppliers:', err));
  }, [fetchSuppliers]);
  
  // Open modal for creation
  const handleOpenCreate = () => {
    setEditingSupplierId(null);
    form.setValues({
      vendorName: '',
      trn: '',
    });
    form.clearErrors();
    openItemModal();
  };
  
  // Open modal for editing
  const handleOpenEdit = (supplier: SupplierItem) => {
    setEditingSupplierId(supplier.id);
    form.setValues({
      vendorName: supplier.vendorName || '',
      trn: supplier.trn || '',
    });
    form.clearErrors();
    openItemModal();
  };
  
  // Save or Update Supplier via useForm Submit Handler
  const handleSaveSupplier = async (values: FormValues) => {
    try {
      setSubmitting(true);
      
      const supplierRef = editingSupplierId
        ? doc(db, 'suppliers', editingSupplierId)
        : doc(collection(db, 'suppliers'));
      
      const supplierData: any = {
        vendorName: values.vendorName.trim(),
        trn: values.trn.trim().toUpperCase(),
        updatedAt: serverTimestamp(),
      };
      
      if (!editingSupplierId) {
        supplierData.createdAt = serverTimestamp();
      }
      
      await setDoc(supplierRef, supplierData, { merge: true });
      closeItemModal();
      await fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle Bulk Excel Upload for Suppliers
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    try {
      setBulkSubmitting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        alert('The uploaded Excel file is empty.');
        return;
      }
      
      for (const row of jsonData) {
        const vendorName = String(row.vendorName || row['Vendor Name'] || row.vendor_name || '').trim();
        const trn = String(row.trn || row.TRN || '').trim().toUpperCase();
        
        if (!vendorName || !trn) continue;
        
        // Generate a deterministic or random document ID based on TRN / Name
        const supplierId = trn.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const supplierRef = doc(db, 'suppliers', supplierId);
        
        await setDoc(supplierRef, {
          vendorName,
          trn,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      
      closeBulkModal();
      await fetchSuppliers();
      alert('Suppliers successfully imported from Excel!');
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Failed to parse Excel file. Please check column formats.');
    } finally {
      setBulkSubmitting(false);
    }
  };
  
  // Delete Supplier
  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      setSuppliers(suppliers.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };
  
  // Filter Logic
  const filteredSuppliers = suppliers.filter((item) => {
    const matchesSearch =
      (item.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.trn || '').toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="xl">
        
        {/* Page Header */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Supplier Management</Title>
              <Text size="xs" c="dimmed">
                Manage registered vendors, trading partners, and tax registration numbers (TRN)
              </Text>
            </div>
            <Group gap="xs">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => {
                  fetchSuppliers().catch((err) => console.error('Failed to refresh suppliers:', err));
                }}
                title="Refresh Suppliers"
              >
                <IconRefresh size={18} />
              </ActionIcon>
              <Button
                variant="light"
                color="myColor"
                leftSection={<IconFileSpreadsheet size={16} />}
                onClick={openBulkModal}
              >
                Bulk Upload
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                color="myColor"
                onClick={handleOpenCreate}
              >
                Add Supplier
              </Button>
            </Group>
          </Group>
        </Paper>
        
        {/* Search Bar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <TextInput
            label="Search Suppliers"
            placeholder="Search by vendor name or TRN..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Paper>
        
        {/* Suppliers List Table */}
        <Stack gap="sm">
          <Title order={4}>Registered Suppliers</Title>
          <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
            {loading ? (
              <Center p="xl">
                <Loader color="myColor" size="md" />
              </Center>
            ) : filteredSuppliers.length === 0 ? (
              <Center p="xl">
                <Text size="xs" c="dimmed">No suppliers found matching your search.</Text>
              </Center>
            ) : (
              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Vendor Name</Table.Th>
                    <Table.Th>TRN</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSuppliers.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td fw={600}>{item.vendorName}</Table.Td>
                      <Table.Td fw={700} c="myColor.6">{item.trn}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon
                            variant="subtle"
                            color="myColor"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Supplier"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteSupplier(item.id)}
                            title="Delete Supplier"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Stack>
      
      {/* Create / Edit Supplier Modal */}
      <Modal
        opened={opened}
        onClose={closeItemModal}
        title={
          <Group gap="xs">
            <IconBuildingStore size={20} color="var(--mantine-color-myColor-6)" />
            <Text fw={700}>{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</Text>
          </Group>
        }
        centered
        radius="md"
      >
        <form onSubmit={form.onSubmit(handleSaveSupplier)}>
          <Stack gap="md">
            <TextInput
              label="Vendor Name"
              placeholder="e.g. Al Maya Aluminum & Glass Trading"
              {...form.getInputProps('vendorName')}
              required
            />
            
            <TextInput
              label="TRN"
              placeholder="e.g. TRN-100293847500003"
              {...form.getInputProps('trn')}
              required
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeItemModal}>Cancel</Button>
              <Button type="submit" color="myColor" loading={submitting}>
                {editingSupplierId ? 'Update Supplier' : 'Save Supplier'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
      {/* Bulk Excel Upload Modal */}
      <Modal
        opened={bulkOpened}
        onClose={closeBulkModal}
        title={
          <Group gap="xs">
            <IconFileSpreadsheet size={20} color="var(--mantine-color-myColor-6)" />
            <Text fw={700}>Bulk Upload Suppliers via Excel</Text>
          </Group>
        }
        centered
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
              Upload an Excel (.xlsx, .xls) or CSV file containing your suppliers using these exact columns:
            </Text>
            <Button
              variant="subtle"
              size="xs"
              color="myColor"
              leftSection={<IconFileSpreadsheet size={14} />}
              onClick={() => {
                const templateData = [{
                  vendorName: 'Al Maya Aluminum & Glass Trading',
                  trn: 'TRN-100293847500003'
                }];
                const ws = XLSX.utils.json_to_sheet(templateData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Suppliers Template");
                XLSX.writeFile(wb, "suppliers_template.xlsx");
              }}
            >
              Download Template
            </Button>
          </Group>
          
          <Paper p="xs" withBorder bg="gray.0">
            <Code block color="gray" p="xs">
              vendorName | trn
            </Code>
          </Paper>
          
          {bulkSubmitting ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Loader color="myColor" size="lg" />
                <Text size="xs" c="dimmed">Importing suppliers into database...</Text>
              </Stack>
            </Center>
          ) : (
            <Dropzone
              onDrop={handleFileUpload}
              accept={[MIME_TYPES.xlsx, MIME_TYPES.xls, MIME_TYPES.csv]}
              maxFiles={1}
            >
              <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={50} color="var(--mantine-color-myColor-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={50} color="red" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFileSpreadsheet size={50} color="gray" />
                </Dropzone.Idle>
                
                <div>
                  <Text size="sm" inline fw={600}>
                    Drag Excel file here or click to select file
                  </Text>
                  <Text size="xs" c="dimmed" inline mt={7}>
                    Supports .xlsx, .xls and .csv file formats
                  </Text>
                </div>
              </Group>
            </Dropzone>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeBulkModal} disabled={bulkSubmitting}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}