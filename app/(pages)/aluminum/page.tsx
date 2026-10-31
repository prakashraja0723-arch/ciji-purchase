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
  Badge,
  TextInput,
  Select,
  NumberInput,
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
  IconBuildingFactory2,
  IconFileSpreadsheet,
  IconUpload,
  IconX,
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

interface AluminumItem {
  id: string;
  code: string;
  name: string;
  systemSeries: string;
  finish: string;
  length: number;
  weightPerMeter: number;
  createdAt?: Timestamp;
}

interface FormValues {
  code: string;
  name: string;
  systemSeries: string;
  finish: string;
  length: number;
  weightPerMeter: number;
}

export default function AluminumManagementPage() {
  const [items, setItems] = useState<AluminumItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<string | null>('All');
  
  // Modals State
  const [opened, { open: openItemModal, close: closeItemModal }] = useDisclosure(false);
  const [bulkOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  
  // Mantine useForm Hook setup for Aluminum profiles (Strictly requested fields)
  const form = useForm<FormValues>({
    initialValues: {
      code: '',
      name: '',
      systemSeries: 'Series 60',
      finish: 'Mill Finish',
      length: 6.0,
      weightPerMeter: 1.25,
    },
    validate: {
      code: (value) => (value.trim().length < 2 ? 'Profile code is required' : null),
      name: (value) => (value.trim().length < 2 ? 'Profile name is required' : null),
      systemSeries: (value) => (!value ? 'System series is required' : null),
      finish: (value) => (!value.trim() ? 'Finish is required' : null),
      length: (value) => (value <= 0 ? 'Length must be greater than 0' : null),
      weightPerMeter: (value) => (value <= 0 ? 'Weight per meter must be greater than 0' : null),
    },
  });
  
  // Fetch Aluminum Items from Firestore
  const fetchAluminum = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'aluminum'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const loadedItems: AluminumItem[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AluminumItem, 'id'>),
      }));
      setItems(loadedItems);
    } catch (error) {
      console.error('Error fetching aluminum profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAluminum().catch((err) => console.error('Failed to load aluminum inventory:', err));
  }, [fetchAluminum]);
  
  // Open modal for creation
  const handleOpenCreate = () => {
    setEditingItemId(null);
    form.setValues({
      code: `AL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      systemSeries: 'Series 60',
      finish: 'Mill Finish',
      length: 6.0,
      weightPerMeter: 1.25,
    });
    form.clearErrors();
    openItemModal();
  };
  
  // Open modal for editing
  const handleOpenEdit = (item: AluminumItem) => {
    setEditingItemId(item.id);
    form.setValues({
      code: item.code || '',
      name: item.name || '',
      systemSeries: item.systemSeries || 'Series 60',
      finish: item.finish || 'Mill Finish',
      length: item.length || 6.0,
      weightPerMeter: item.weightPerMeter || 1.25,
    });
    form.clearErrors();
    openItemModal();
  };
  
  // Save or Update Aluminum Item via useForm Submit Handler
  const handleSaveItem = async (values: FormValues) => {
    try {
      setSubmitting(true);
      
      const itemRef = editingItemId
        ? doc(db, 'aluminum', editingItemId)
        : doc(collection(db, 'aluminum'));
      
      const itemData: any = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim().toUpperCase(),
        systemSeries: values.systemSeries,
        finish: values.finish.trim(),
        length: Number(values.length),
        weightPerMeter: Number(values.weightPerMeter),
        updatedAt: serverTimestamp(),
      };
      
      if (!editingItemId) {
        itemData.createdAt = serverTimestamp();
      }
      
      await setDoc(itemRef, itemData, { merge: true });
      closeItemModal();
      await fetchAluminum();
    } catch (error) {
      console.error('Error saving aluminum item:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle Bulk Excel Upload for Aluminum Profiles
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
        const code = String(row.code || row.Code || '').trim().toUpperCase();
        const name = String(row.name || row.Name || '').trim().toUpperCase();
        const systemSeries = String(row.systemSeries || row['System Series'] || row.system_series || 'Series 60').trim();
        const finish = String(row.finish || row.Finish || 'Mill Finish').trim();
        const length = Number(row.length || row.Length || 6.0);
        const weightPerMeter = Number(row.weightPerMeter || row['Weight Per Meter'] || row.weight_per_meter || 1.25);
        
        if (!name || !code) continue;
        
        const itemId = code.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const itemRef = doc(db, 'aluminum', itemId);
        
        await setDoc(itemRef, {
          code,
          name,
          systemSeries,
          finish,
          length,
          weightPerMeter,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      
      closeBulkModal();
      await fetchAluminum();
      alert('Aluminum profiles successfully imported from Excel!');
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Failed to parse Excel file. Please check column formats.');
    } finally {
      setBulkSubmitting(false);
    }
  };
  
  // Delete Aluminum Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this aluminum profile?')) return;
    try {
      await deleteDoc(doc(db, 'aluminum', id));
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting aluminum item:', error);
    }
  };
  
  // Filter Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesSeries =
      seriesFilter === 'All' ||
      !seriesFilter ||
      (item.systemSeries || '').toLowerCase() === seriesFilter.toLowerCase();
    
    return matchesSearch && matchesSeries;
  });
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="xl">
        
        {/* Page Header */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Aluminum Profiles Management</Title>
              <Text size="xs" c="dimmed">
                Manage extrusion profiles, system series, finishes, lengths, and unit weights
              </Text>
            </div>
            <Group gap="xs">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => {
                  fetchAluminum().catch((err) => console.error('Failed to refresh aluminum items:', err));
                }}
                title="Refresh Aluminum Profiles"
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
                Add Profile
              </Button>
            </Group>
          </Group>
        </Paper>
        
        {/* Filters & Search Bar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group grow align="flex-end">
            <TextInput
              label="Search Profiles"
              placeholder="Search by profile name or code..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              label="System Series Filter"
              data={['All', 'Series 50', 'Series 60', 'Series 100', 'Curtain Wall']}
              value={seriesFilter}
              onChange={setSeriesFilter}
            />
          </Group>
        </Paper>
        
        {/* Aluminum List Table */}
        <Stack gap="sm">
          <Title order={4}>Extrusion Profiles</Title>
          <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
            {loading ? (
              <Center p="xl">
                <Loader color="myColor" size="md" />
              </Center>
            ) : filteredItems.length === 0 ? (
              <Center p="xl">
                <Text size="xs" c="dimmed">No aluminum profiles found matching your search.</Text>
              </Center>
            ) : (
              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>System Series</Table.Th>
                    <Table.Th>Finish</Table.Th>
                    <Table.Th>Length</Table.Th>
                    <Table.Th>Weight/Meter</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredItems.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td fw={700} c="myColor.6">{item.code}</Table.Td>
                      <Table.Td fw={600}>{item.name}</Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="outline" color="gray">
                          {item.systemSeries}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{item.finish}</Table.Td>
                      <Table.Td fw={600}>{item.length}m</Table.Td>
                      <Table.Td fw={600}>{item.weightPerMeter} kg/m</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon
                            variant="subtle"
                            color="myColor"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Profile"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Profile"
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
      
      {/* Create / Edit Aluminum Modal */}
      <Modal
        opened={opened}
        onClose={closeItemModal}
        title={
          <Group gap="xs">
            <IconBuildingFactory2 size={20} color="var(--mantine-color-myColor-6)" />
            <Text fw={700}>{editingItemId ? 'Edit Aluminum Profile' : 'Add New Aluminum Profile'}</Text>
          </Group>
        }
        centered
        radius="md"
      >
        <form onSubmit={form.onSubmit(handleSaveItem)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g. SLIDING TRACK PROFILE"
              {...form.getInputProps('name')}
              required
            />
            
            <Group grow align="flex-start">
              <TextInput
                label="Code"
                placeholder="e.g. AL-6001"
                {...form.getInputProps('code')}
                required
              />
              <Select
                label="System Series"
                data={['Series 50', 'Series 60', 'Series 100', 'Curtain Wall']}
                {...form.getInputProps('systemSeries')}
                required
              />
            </Group>
            
            <TextInput
              label="Finish"
              placeholder="e.g. Mill Finish / Powder Coated"
              {...form.getInputProps('finish')}
              required
            />
            
            <Group grow align="flex-start">
              <NumberInput
                label="Length (m)"
                placeholder="6.0"
                {...form.getInputProps('length')}
                required
                min={0.1}
                decimalScale={2}
              />
              <NumberInput
                label="Weight Per Meter (kg/m)"
                placeholder="1.25"
                {...form.getInputProps('weightPerMeter')}
                required
                min={0.01}
                decimalScale={3}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeItemModal}>Cancel</Button>
              <Button type="submit" color="myColor" loading={submitting}>
                {editingItemId ? 'Update Profile' : 'Save Profile'}
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
            <Text fw={700}>Bulk Upload Aluminum Profiles via Excel</Text>
          </Group>
        }
        centered
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
              Upload an Excel (.xlsx, .xls) or CSV file containing your aluminum profiles using these exact columns:
            </Text>
            <Button
              variant="subtle"
              size="xs"
              color="myColor"
              leftSection={<IconFileSpreadsheet size={14} />}
              onClick={() => {
                const templateData = [{
                  code: 'AL-6001',
                  name: 'SLIDING TRACK PROFILE',
                  systemSeries: 'Series 60',
                  finish: 'Mill Finish',
                  length: 6.0,
                  weightPerMeter: 1.25
                }];
                const ws = XLSX.utils.json_to_sheet(templateData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Aluminum Template");
                XLSX.writeFile(wb, "aluminum_template.xlsx");
              }}
            >
              Download Template
            </Button>
          </Group>
          
          <Paper p="xs" withBorder bg="gray.0">
            <Code block color="gray" p="xs">
              code | name | systemSeries | finish | length | weightPerMeter
            </Code>
          </Paper>
          
          {bulkSubmitting ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Loader color="myColor" size="lg" />
                <Text size="xs" c="dimmed">Importing aluminum profiles into database...</Text>
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