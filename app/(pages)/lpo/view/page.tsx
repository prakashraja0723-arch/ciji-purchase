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
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
  itemType: 'Accessories' | 'Aluminum';
  itemName: string;
  qty: number;
  accCode?: string;
  code?: string;
  length?: number;
  kg?: number;
  orderedQty?: number;
  itemStatus?: string;
}

interface FirestoreLPO {
  lpoNo: string;
  materialRequestNo: string;
  projectName: string;
  requestType: string;
  storekeeperUid: string;
  items: RequestItem[];
}

function ViewLpoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [lpoData, setLpoData] = useState<FirestoreLPO | null>(null);

  const fetchLpo = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'lpos', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLpoData(docSnap.data() as FirestoreLPO);
      }
    } catch (error) {
      console.error('Error fetching LPO details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLpo().catch((err) => console.error('Failed to load LPO details:', err));
  }, [fetchLpo]);

  if (loading) {
    return (
      <Center p="xl" style={{ height: '50vh' }}>
        <Loader color="myColor" size="lg" />
      </Center>
    );
  }

  if (!id || !lpoData) {
    return (
      <Container size="lg" p="xl">
        <Text c="red" fw={600}>Local Purchase Order not found.</Text>
        <Button mt="md" variant="default" onClick={() => router.push('/lpo')}>
          Back to LPO Management
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
              <ActionIcon variant="subtle" color="gray" onClick={() => router.push('/lpo')}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={3}>LPO Details: {lpoData.lpoNo}</Title>
                <Text size="xs" c="dimmed">Project: {lpoData.projectName} | MR No: {lpoData.materialRequestNo}</Text>
              </div>
            </Group>
            <Group gap="xs">
              <Button
                variant="light"
                color="blue"
                leftSection={<IconPrinter size={16} />}
                onClick={() => router.push(`/lpo/print?id=${id}`)}
              >
                Go to Print Page
              </Button>
              <Button variant="default" onClick={() => router.push('/lpo')}>
                Back to LPO
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* LPO Summary Details */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Group grow>
              <div>
                <Text size="xs" c="dimmed">LPO Number</Text>
                <Text fw={700} size="sm" c="blue.6">{lpoData.lpoNo}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Material Request No</Text>
                <Text fw={600} size="sm">{lpoData.materialRequestNo}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Batch Type</Text>
                <Badge size="sm" color={lpoData.requestType === 'Aluminum' ? 'blue' : 'myColor'}>
                  {lpoData.requestType}
                </Badge>
              </div>
            </Group>

            <Divider my="xs" />

            <Group justify="space-between" align="center">
              <Title order={5}>Ordered Items</Title>
              <Badge size="sm" variant="light" color="gray">
                Total Items: {lpoData.items?.length || 0}
              </Badge>
            </Group>

            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item Name</Table.Th>
                  <Table.Th>Specs / Details</Table.Th>
                  <Table.Th>Ordered Qty</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lpoData.items.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td fw={500}>{item.itemName}</Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {item.itemType === 'Accessories' ? (
                          <>Acc Code: {item.accCode || '-'}</>
                        ) : (
                          <>Code: {item.code || '-'} | L: {item.length}m | KG: {item.kg || '-'}kg</>
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td fw={700}>{item.qty}</Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="light" color="blue">
                        {item.itemStatus || 'Ordered'}
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

export default function ViewLpoPage() {
  return (
    <Suspense
      fallback={
        <Center p="xl" style={{ height: '50vh' }}>
          <Loader color="myColor" size="lg" />
        </Center>
      }
    >
      <ViewLpoContent />
    </Suspense>
  );
}