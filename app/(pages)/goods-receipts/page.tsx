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
  Table,
  Badge,
  ActionIcon,
  Loader,
  Center,
  TextInput,
} from '@mantine/core';
import { IconSearch, IconEye, IconRefresh } from '@tabler/icons-react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface GoodsReceiptDoc {
  id: string;
  lpoNo: string;
  materialRequestNo: string;
  projectName: string;
  status: 'Pending Delivery' | 'Partially Received' | 'Completed';
  createdAt?: Timestamp;
}

export default function GoodsReceiptsListPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<GoodsReceiptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'goodsReceipts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loaded: GoodsReceiptDoc[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<GoodsReceiptDoc, 'id'>),
      }));
      setReceipts(loaded);
    } catch (error) {
      console.error('Error fetching goods receipts list:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchReceipts().catch((err) => console.error(err));
  }, [fetchReceipts]);
  
  const filteredReceipts = receipts.filter(
    (r) =>
      r.lpoNo.toLowerCase().includes(search.toLowerCase()) ||
      r.projectName.toLowerCase().includes(search.toLowerCase()) ||
      r.materialRequestNo.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>Goods Receipts (GRN)</Title>
              <Text size="xs" c="dimmed">
                Track incoming LPO shipments, verify deliveries, and manage store receipt statuses
              </Text>
            </div>
            <ActionIcon variant="default" size="lg" onClick={fetchReceipts} title="Refresh List">
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Paper>
        
        {/* Search Bar */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <TextInput
            placeholder="Search by LPO No, Project Name, or MR No..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Paper>
        
        {/* Receipts Table */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          {loading ? (
            <Center p="xl">
              <Loader color="myColor" size="md" />
            </Center>
          ) : filteredReceipts.length === 0 ? (
            <Center p="xl">
              <Text c="dimmed" size="sm">No goods receipts or ordered LPOs found.</Text>
            </Center>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>LPO No</Table.Th>
                  <Table.Th>Material Request</Table.Th>
                  <Table.Th>Project Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredReceipts.map((rec) => (
                  <Table.Tr key={rec.id}>
                    <Table.Td fw={600} c="blue.6">{rec.lpoNo}</Table.Td>
                    <Table.Td>{rec.materialRequestNo}</Table.Td>
                    <Table.Td>{rec.projectName}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        color={
                          rec.status === 'Completed'
                            ? 'green'
                            : rec.status === 'Partially Received'
                              ? 'yellow'
                              : 'gray'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => router.push(`/goods-receipts/detail?id=${rec.id}`)}
                        title="View / Receive Items"
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