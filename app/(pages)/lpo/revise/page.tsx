'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { IconSearch, IconEye, IconRefresh } from '@tabler/icons-react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
  itemName: string;
  qty: number;
  orderedQty?: number;
  itemStatus?: string;
}

interface RequestDoc {
  id: string;
  materialRequestNo: string;
  projectName: string;
  requestType: 'Accessories' | 'Aluminum';
  status: 'Request' | 'Partially Ordered' | 'Completed';
  items: RequestItem[];
  createdAt?: Timestamp;
}

export default function RequestsListPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('All');
  
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loaded: RequestDoc[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<RequestDoc, 'id'>),
      }));
      setRequests(loaded); // <-- Keeps all requests (including Completed) in state for viewing
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchRequests().catch((err) => console.error(err));
  }, [fetchRequests]);
  
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.materialRequestNo.toLowerCase().includes(search.toLowerCase()) ||
      req.projectName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || !statusFilter || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Material Requests</Title>
              <Text size="xs" c="dimmed">
                Track material requisitions, review order progress, and check completed request histories
              </Text>
            </div>
            <ActionIcon variant="default" size="lg" onClick={fetchRequests} title="Refresh List">
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Paper>
        
        {/* Search & Filter Bar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group grow align="flex-end">
            <TextInput
              label="Search Requests"
              placeholder="Search by MR No or Project Name..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              label="Status Filter"
              data={['All', 'Request', 'Partially Ordered', 'Completed']}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Group>
        </Paper>
        
        {/* Requests Table */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          {loading ? (
            <Center p="xl">
              <Loader color="myColor" size="md" />
            </Center>
          ) : filteredRequests.length === 0 ? (
            <Center p="xl">
              <Text c="dimmed" size="sm">No requests found matching your filter criteria.</Text>
            </Center>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>MR Number</Table.Th>
                  <Table.Th>Project Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredRequests.map((req) => (
                  <Table.Tr key={req.id}>
                    <Table.Td fw={700}>{req.materialRequestNo}</Table.Td>
                    <Table.Td>{req.projectName}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={req.requestType === 'Aluminum' ? 'blue' : 'gray'}>
                        {req.requestType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        color={
                          req.status === 'Completed'
                            ? 'green'
                            : req.status === 'Partially Ordered'
                              ? 'orange'
                              : 'gray'
                        }
                      >
                        {req.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => router.push(`/requests/view?id=${req.id}`)}
                        title="View Full Request Details"
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}