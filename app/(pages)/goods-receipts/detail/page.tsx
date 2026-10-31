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
  NumberInput,
  ActionIcon,
  Loader,
  Center,
  Badge,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReceiptItem {
  itemName: string;
  code?: string;
  accCode?: string;
  qty: number;
  receivedQty?: number;
  itemStatus?: string;
}

interface GoodsReceiptDoc {
  id: string;
  lpoNo: string;
  materialRequestNo: string;
  projectName: string;
  status: 'Pending Delivery' | 'Partially Received' | 'Completed';
  items: ReceiptItem[];
}

function GoodsReceiptDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<GoodsReceiptDoc | null>(null);
  
  const [currentReceivedQtys, setCurrentReceivedQtys] = useState<{ [index: number]: number }>({});
  
  const [errorModalOpened, { open: openErrorModal, close: closeErrorModal }] = useDisclosure(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
  
  const triggerError = (title: string, message: string) => {
    setErrorMessage({ title, message });
    openErrorModal();
  };
  
  const fetchReceiptData = useCallback(async () => {
    if (!receiptId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'goodsReceipts', receiptId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as GoodsReceiptDoc;
        setReceiptData(data);
        
        const initialQtys: { [index: number]: number } = {};
        data.items.forEach((item, idx) => {
          initialQtys[idx] = item.receivedQty || 0;
        });
        setCurrentReceivedQtys(initialQtys);
      }
    } catch (error) {
      console.error('Error fetching Goods Receipt:', error);
      triggerError('Loading Error', 'Failed to fetch goods receipt details from database.');
    } finally {
      setLoading(false);
    }
  }, [receiptId]);
  
  useEffect(() => {
    fetchReceiptData().catch((err) => console.error(err));
  }, [fetchReceiptData]);
  
  const handleReceivedQtyChange = (index: number, val: number | string) => {
    const num = typeof val === 'number' ? val : val === '' ? 0 : Number(val);
    setCurrentReceivedQtys((prev) => ({ ...prev, [index]: num }));
  };
  
  const handleSaveDeliveryReceipt = async () => {
    if (!receiptData || !receiptId || submitting) return;
    
    setSubmitting(true);
    try {
      let allFullyReceived = true;
      let anyReceived = false;
      
      const updatedItems = receiptData.items.map((item, idx) => {
        const newlyReceived = currentReceivedQtys[idx] || 0;
        
        if (newlyReceived > 0) anyReceived = true;
        if (newlyReceived < item.qty) allFullyReceived = false;
        
        return {
          ...item,
          receivedQty: newlyReceived,
        };
      });
      
      const receiptRef = doc(db, 'goodsReceipts', receiptId);
      
      // If fully received / completed, delete from goodsReceipts and complete LPO
      if (allFullyReceived) {
        // 1. Permanently delete the goods receipt entry since it's fully complete
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(receiptRef);
        
        // 2. Sync corresponding LPO status to completed
        if (receiptData.lpoNo) {
          const lpoQuery = query(collection(db, 'lpos'), where('lpoNo', '==', receiptData.lpoNo));
          const lpoSnap = await getDocs(lpoQuery);
          lpoSnap.forEach(async (lpoDocSnap) => {
            await updateDoc(doc(db, 'lpos', lpoDocSnap.id), {
              status: 'Delivered & Completed',
            });
          });
        }
      } else {
        // Otherwise, if partially received, update status accordingly
        const newStatus = anyReceived ? 'Partially Received' : 'Pending Delivery';
        await updateDoc(receiptRef, {
          items: updatedItems,
          status: newStatus,
          updatedAt: Timestamp.now(),
        });
      }
      
      router.push('/goods-receipts');
    } catch (error) {
      console.error('Error updating goods receipt delivery:', error);
      triggerError('Save Error', 'Failed to update goods receipt delivery status.');
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Center p="xl" style={{ height: '50vh' }}>
        <Loader color="myColor" size="lg" />
      </Center>
    );
  }
  
  if (!receiptData) {
    return (
      <Container size="lg" p="xl">
        <Text c="red" fw={600}>Goods Receipt record not found.</Text>
        <Button mt="md" variant="default" onClick={() => router.push('/goods-receipts')}>
          Back to Goods Receipts
        </Button>
      </Container>
    );
  }
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon variant="subtle" color="gray" disabled={submitting} onClick={() => router.push('/goods-receipts')}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={3}>Goods Receipt: {receiptData.lpoNo}</Title>
                <Text size="xs" c="dimmed">
                  Project: {receiptData.projectName} | MR No: {receiptData.materialRequestNo}
                </Text>
              </div>
            </Group>
            <Badge
              size="lg"
              color={
                receiptData.status === 'Completed'
                  ? 'green'
                  : receiptData.status === 'Partially Received'
                    ? 'yellow'
                    : 'gray'
              }
            >
              {receiptData.status}
            </Badge>
          </Group>
        </Paper>
        
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stack gap="md">
            <Title order={5}>Verify & Update Delivered Quantities</Title>
            <Text size="xs" c="dimmed">
              Enter the exact quantities received on-site. The status will automatically switch to &apos;Partially Received&apos; or &apos;Completed&apos; upon saving.
            </Text>
            
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item Code</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Ordered Qty</Table.Th>
                  <Table.Th style={{ width: '160px' }}>Received Qty Now</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {receiptData.items.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td fw={500}>{item.code || item.accCode || '-'}</Table.Td>
                    <Table.Td>{item.itemName}</Table.Td>
                    <Table.Td fw={600}>{item.qty}</Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        max={item.qty}
                        value={currentReceivedQtys[idx] ?? 0}
                        onChange={(val) => handleReceivedQtyChange(idx, val)}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" disabled={submitting} onClick={() => router.push('/goods-receipts')}>
                Cancel
              </Button>
              <Button
                color="myColor"
                leftSection={submitting ? <Loader size={16} color="white" /> : <IconCheck size={16} />}
                loading={submitting}
                onClick={handleSaveDeliveryReceipt}
              >
                {submitting ? 'Updating Status...' : 'Save & Update Status'}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
      
      <Modal
        opened={errorModalOpened}
        onClose={closeErrorModal}
        title={
          <Group gap="xs">
            <IconAlertCircle size={22} color="var(--mantine-color-red-7)" />
            <Text fw={700} c="red.7">{errorMessage.title}</Text>
          </Group>
        }
        radius="md"
        centered
      >
        <Stack gap="md">
          <Paper p="md" withBorder bg="red.0" radius="sm">
            <Text size="sm" c="red.9" fw={500}>{errorMessage.message}</Text>
          </Paper>
          <Group justify="flex-end" mt="xs">
            <Button color="red" variant="light" onClick={closeErrorModal}>
              OK, Got It
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function GoodsReceiptDetailPage() {
  return (
    <Suspense
      fallback={
        <Center p="xl" style={{ height: '50vh' }}>
          <Loader color="myColor" size="lg" />
        </Center>
      }
    >
      <GoodsReceiptDetailContent />
    </Suspense>
  );
}