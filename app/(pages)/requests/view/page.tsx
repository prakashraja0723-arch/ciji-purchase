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
  Badge,
  Divider,
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
  itemType: 'Accessories' | 'Aluminum';
  itemName: string;
  qty: number;
  unit?: string; // <-- Updated from qtyUnit to unit
  accCode?: string;
  code?: string;
  length?: number;
  kg?: number;
  ral?: string;
  orderedQty?: number;
  itemStatus?: string;
}

interface FirestoreRequest {
  materialRequestNo: string;
  projectName: string;
  storekeeperUid: string;
  purchaserUid?: string | null;
  status: string;
  requestType: 'Accessories' | 'Aluminum';
  lpoNo?: string;
  items: RequestItem[];
}

function ViewRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<FirestoreRequest | null>(null);
  
  const fetchRequest = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRequestData(docSnap.data() as FirestoreRequest);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchRequest().catch((err) => console.error('Failed to fetch request details:', err));
  }, [fetchRequest]);
  
  if (loading) {
    return (
      <Center p="xl" style={{ height: '50vh' }}>
        <Loader color="myColor" size="lg" />
      </Center>
    );
  }
  
  if (!id || !requestData) {
    return (
      <Container size="lg" p="xl">
        <Text c="red" fw={600}>Requisition not found.</Text>
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
                <Title order={3}>
                  {requestData.materialRequestNo} — {requestData.projectName}
                </Title>
                <Text size="xs" c="dimmed">
                  Project Name: {requestData.projectName} | LPO: {requestData.lpoNo || 'Not Issued Yet'}
                </Text>
              </div>
            </Group>
            <Button variant="default" onClick={() => router.push('/requests')}>
              Back to Requests
            </Button>
          </Group>
        </Paper>
        
        {/* Metadata Details */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Group grow>
              <div>
                <Text size="xs" c="dimmed">Requested By</Text>
                <Text fw={600} size="sm">{requestData.storekeeperUid}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Purchaser UID</Text>
                <Text fw={600} size="sm">{requestData.purchaserUid || 'Not Assigned Yet'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Batch Type</Text>
                <Badge size="sm" color={requestData.requestType === 'Aluminum' ? 'blue' : 'myColor'}>
                  {requestData.requestType}
                </Badge>
              </div>
            </Group>
            
            <Divider my="xs" />
            
            <Group justify="space-between" align="center">
              <Title order={5}>Item Batch Details & Status</Title>
              <Badge size="sm" variant="light" color="gray">
                Overall Status: {requestData.status}
              </Badge>
            </Group>
            
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item Name</Table.Th>
                  <Table.Th>Details / Specs</Table.Th>
                  <Table.Th>Requested Qty</Table.Th>
                  <Table.Th>Unit</Table.Th>
                  <Table.Th>Ordered Qty</Table.Th>
                  <Table.Th>Item Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {requestData.items.map((item, idx) => (
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
                    <Table.Td fw={700}>{item.qty}</Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="outline" color="gray">
                        {item.unit || (item.itemType === 'Aluminum' ? 'Lengths' : 'PCS')}
                      </Badge>
                    </Table.Td>
                    <Table.Td fw={700} c="blue.6">
                      {item.orderedQty !== undefined ? item.orderedQty : (requestData.status !== 'Request' ? item.qty : 0)}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          item.itemStatus === 'Received (Complete)'
                            ? 'green'
                            : item.itemStatus === 'Partially Received'
                              ? 'orange'
                              : requestData.status === 'Request'
                                ? 'gray'
                                : 'blue'
                        }
                      >
                        {item.itemStatus || requestData.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default function ViewRequestPage() {
  return (
    <Suspense
      fallback={
        <Center p="xl" style={{ height: '50vh' }}>
          <Loader color="myColor" size="lg" />
        </Center>
      }
    >
      <ViewRequestContent />
    </Suspense>
  );
}
