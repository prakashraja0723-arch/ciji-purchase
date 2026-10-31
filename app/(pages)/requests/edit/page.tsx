'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  NumberInput,
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { IconArrowLeft, IconTrash, IconCheck, IconPlus } from '@tabler/icons-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
  itemType: 'Accessories' | 'Aluminum';
  itemName: string;
  qty: number;
  accCode?: string;
  code?: string;
  description?: string;
  length?: number;
  kg?: number;
  ral?: string;
}

function EditRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [materialRequestNo, setMaterialRequestNo] = useState('');
  const [requestType, setRequestType] = useState<'Accessories' | 'Aluminum'>('Accessories');
  const [items, setItems] = useState<RequestItem[]>([]);
  
  // State for adding a *new* item in edit mode
  const [newItemName, setNewItemName] = useState('');
  const [newQty, setNewQty] = useState<number | ''>(1);
  const [newAccCode, setNewAccCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLength, setNewLength] = useState<number | ''>(6);
  const [newKg, setNewKg] = useState<number | ''>('');
  const [newRal, setNewRal] = useState('');
  
  const fetchRequest = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProjectName(data.projectName || '');
        setMaterialRequestNo(data.materialRequestNo || '');
        setRequestType(data.requestType || 'Accessories');
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching request for edit:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchRequest().catch((err) => console.error('Failed to fetch request:', err));
  }, [fetchRequest]);
  
  const handleQtyChange = (index: number, newQtyVal: number | string) => {
    const numVal = typeof newQtyVal === 'number' ? newQtyVal : newQtyVal === '' ? 0 : Number(newQtyVal);
    const updated = [...items];
    updated[index].qty = numVal;
    setItems(updated);
  };
  
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };
  
  const handleAddNewItem = () => {
    if (!newItemName) return;
    
    const parsedQty = typeof newQty === 'number' ? newQty : newQty === '' ? 1 : Number(newQty);
    const parsedLength = typeof newLength === 'number' ? newLength : newLength === '' ? 6 : Number(newLength);
    const parsedKg = typeof newKg === 'number' ? newKg : newKg === '' ? 0 : Number(newKg);
    
    const newItem: RequestItem = {
      itemType: requestType,
      itemName: newItemName,
      qty: parsedQty,
      ...(requestType === 'Accessories'
        ? { accCode: newAccCode || 'ACC-GEN' }
        : {
          code: newCode || 'ALU-GEN',
          length: parsedLength,
          kg: parsedKg,
          ral: newRal || 'RAL 9010',
        }),
    };
    
    setItems([...items, newItem]);
    
    // Reset new item form fields
    setNewItemName('');
    setNewQty(1);
    setNewAccCode('');
    setNewCode('');
    setNewLength(6);
    setNewKg('');
    setNewRal('');
  };
  
  const handleSave = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'requests', id);
      await updateDoc(docRef, {
        projectName,
        items,
      });
      router.push('/requests');
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };
  
  if (loading) {
    return (
      <Center p="xl" style={{ height: '50vh' }}>
        <Loader color="myColor" size="lg" />
      </Center>
    );
  }
  
  if (!id) {
    return (
      <Container size="lg" p="xl">
        <Text c="red" fw={600}>No Requisition ID provided.</Text>
        <Button mt="md" variant="default" onClick={() => router.push('/requests')}>
          Back to Requests
        </Button>
      </Container>
    );
  }
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon variant="subtle" color="gray" onClick={() => router.push('/requests')}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={3}>Edit Requisition: {materialRequestNo}</Title>
                <Text size="xs" c="dimmed">Modify project details, update quantities, or add new items</Text>
              </div>
            </Group>
            <Button variant="default" onClick={() => router.push('/requests')}>
              Cancel
            </Button>
          </Group>
        </Paper>
        
        {/* Project Details */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Title order={5} c="myColor">Project Information</Title>
            <Group grow>
              <TextInput
                label="Project Name / Reference"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <TextInput
                label="Batch Type (Locked)"
                value={requestType}
                disabled
              />
            </Group>
          </Stack>
        </Paper>
        
        {/* Existing Items Table */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Title order={5}>Current Requisition Items ({items.length})</Title>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item Name</Table.Th>
                  <Table.Th>Details</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Remove</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center">
                      <Text size="xs" c="dimmed">No items in this batch.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td fw={500}>{item.itemName}</Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {item.itemType === 'Accessories' ? (
                            <>Acc Code: {item.accCode || '-'}</>
                          ) : (
                            <>Code: {item.code || '-'} | L: {item.length}m | KG: {item.kg || '-'}kg | RAL: {item.ral}</>
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          min={1}
                          value={item.qty}
                          onChange={(val) => handleQtyChange(idx, val)}
                          style={{ width: '110px' }}
                        />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveItem(idx)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
        
        {/* Add New Item Section */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Title order={5} c="myColor">Add New Item to Batch</Title>
            <Group grow>
              <TextInput
                label="Item Name / Description"
                placeholder="e.g., Heavy-Duty Roller"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <NumberInput
                label="Quantity"
                min={1}
                value={newQty}
                onChange={(val) => setNewQty(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
              />
            </Group>
            
            {requestType === 'Accessories' ? (
              <TextInput
                label="Accessory Code"
                placeholder="e.g., ACC-ROL-01"
                value={newAccCode}
                onChange={(e) => setNewAccCode(e.target.value)}
              />
            ) : (
              <Group grow>
                <TextInput
                  label="Profile Code"
                  placeholder="e.g., FX-40"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <NumberInput
                  label="Length (m)"
                  value={newLength}
                  onChange={(val) => setNewLength(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
                />
                <NumberInput
                  label="Weight (KG)"
                  value={newKg}
                  onChange={(val) => setNewKg(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
                />
                <TextInput
                  label="RAL Color"
                  value={newRal}
                  onChange={(e) => setNewRal(e.target.value)}
                />
              </Group>
            )}
            
            <Group justify="flex-end">
              <Button
                variant="light"
                color="myColor"
                leftSection={<IconPlus size={16} />}
                onClick={handleAddNewItem}
              >
                Add Item to Batch
              </Button>
            </Group>
          </Stack>
        </Paper>
        
        {/* Actions */}
        <Group justify="flex-end" mb="xl">
          <Button variant="default" onClick={() => router.push('/requests')}>
            Cancel
          </Button>
          <Button color="myColor" leftSection={<IconCheck size={16} />} onClick={handleSave}>
            Save Changes to Requisition
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

export default function EditRequestPage() {
  return (
    <Suspense
      fallback={
        <Center p="xl" style={{ height: '50vh' }}>
          <Loader color="myColor" size="lg" />
        </Center>
      }
    >
      <EditRequestContent />
    </Suspense>
  );
}