'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Table,
  Divider,
  Loader,
  Center,
  Grid,
} from '@mantine/core';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LpoItem {
  itemType: 'Accessories' | 'Aluminum';
  itemName: string;
  qty: number;
  accCode?: string;
  code?: string;
  description?: string;
  length?: number;
  kg?: number;
  ral?: string;
  price?: number;
}

interface LpoData {
  lpoNo?: string;
  supplierName?: string;
  supplierTrn?: string;
  projectName?: string;
  requestType?: string;
  storekeeperUid?: string;
  purchaserName?: string;
  purchaserUsername?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  items?: LpoItem[];
  createdAt?: Timestamp;
}

function OfficialLpoPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lpoId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [lpoData, setLpoData] = useState<LpoData | null>(null);
  
  const fetchLpo = useCallback(async () => {
    if (!lpoId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'lpos', lpoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLpoData(docSnap.data() as LpoData);
      }
    } catch (error) {
      console.error('Error fetching official LPO:', error);
    } finally {
      setLoading(false);
    }
  }, [lpoId]);
  
  
  useEffect(() => {
    fetchLpo().catch((err) => console.error('Failed to load LPO:', err));
  }, [fetchLpo]);
  
  const handlePrint = () => {
    document.title = lpoData?.lpoNo || 'LPO';
    setTimeout(() => {
      window.print();
    }, 100);
  };
  
  if (loading) {
    return (
      <Center p="xl" style={{ height: '50vh' }}>
        <Loader color="myColor" size="lg" />
      </Center>
    );
  }
  
  if (!lpoData) {
    return (
      <Container size="sm" p="xl">
        <Text c="red" fw={600}>LPO Record not found.</Text>
        <Button mt="md" variant="default" onClick={() => router.push('/lpo')}>
          Back to LPO Management
        </Button>
      </Container>
    );
  }
  
  
  const isAluminum = lpoData.requestType === 'Aluminum';
  const formattedDate = lpoData.createdAt?.toDate ? lpoData.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
  
  const rawSupplier = lpoData.supplierName || 'Decent Metalic Products Coating LLC';
  const formattedSupplier = rawSupplier.startsWith('M/s') ? rawSupplier : `M/s. ${rawSupplier}`;
  
  // 1. Prepared By: Strictly displays the Requestor name (storekeeperUid)
  const rawPurchaser = lpoData.purchaserName || 'Storekeeper';
  const capitalizedRequestor = rawPurchaser
    .toLowerCase()
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
  
  // 2. Signature & Stamp: Driven by the Purchaser / Creator name
  const purchaserSignatureName = (lpoData.purchaserUsername  || 'admin').toLowerCase();
  console.log(purchaserSignatureName);
  return (
    <Container size="md" p={0} style={{ width: '100%' }}>
      {/* Top Action Bar (Hidden when printing) */}
      <Group justify="space-between" mb="sm" className="no-print">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => router.push('/lpo')}
        >
          Back to LPO Management
        </Button>
        <Button
          color="myColor"
          size="xs"
          leftSection={<IconPrinter size={14} />}
          onClick={handlePrint}
        >
          Print / Save Official A4 PDF
        </Button>
      </Group>
      
      {/* Official A4 Sheet Container */}
      <Paper
        p="md"
        radius={0}
        withBorder
        style={{
          width: '210mm',
          minHeight: '297mm',
          margin: '10mm auto',
          backgroundColor: '#ffffff',
          color: '#000000',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="a4-sheet"
      >
        <Stack gap="sm">
          {/* HEADER IMAGE ASSET */}
          <div style={{ width: '100%', textAlign: 'center', position: 'relative', height: '120px' }}>
            <Image
              src="/images/lpo-header.png"
              alt="CIJI Official Header"
              fill
              unoptimized
              style={{ objectFit: 'contain' }}
            />
          </div>
          
          {/* Official Document Title */}
          <div style={{ textAlign: 'center', marginTop: '2px' }}>
            <Text size="md" fw={800} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Local Purchase Order
            </Text>
          </div>
          
          {/* Metadata Box */}
          <div style={{ border: '1px solid #ced4da', borderRadius: '4px', padding: '10px 14px' }}>
            <Grid align="stretch">
              {/* Left Column */}
              <Grid.Col span={8} style={{ borderRight: '1px solid #e9ecef', paddingRight: '16px' }}>
                <Stack gap={5}>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>LPO NO:</Text>
                    <Text size="sm" fw={700} ta="right">{lpoData.lpoNo}</Text>
                  </Group>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>Vendor:</Text>
                    <Text size="sm" fw={700} ta="right">{formattedSupplier}</Text>
                  </Group>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>TRN No:</Text>
                    <Text size="sm" fw={700} ta="right">{lpoData.supplierTrn || 'N/A'}</Text>
                  </Group>
                </Stack>
              </Grid.Col>
              
              {/* Right Column */}
              <Grid.Col span={4} style={{ paddingLeft: '16px' }}>
                <Stack gap={5}>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>Project:</Text>
                    <Text size="sm" fw={700} ta="right">{lpoData.projectName || 'mashreq elite'}</Text>
                  </Group>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>Date:</Text>
                    <Text size="sm" fw={700} ta="right">{formattedDate}</Text>
                  </Group>
                  <Group wrap="nowrap" align="flex-start">
                    <Text size="sm" fw={700} c="dimmed" style={{ flexShrink: 0 }}>TRN No:</Text>
                    <Text size="sm" fw={700} ta="right">100351696800003</Text>
                  </Group>
                </Stack>
              </Grid.Col>
            </Grid>
          </div>
          
          <Stack gap={3} mt={2}>
            <Text size="sm" fw={500}>Dear Sir/Madam,</Text>
            <Text size="sm">Please supply the following items as per the details below:</Text>
          </Stack>
          
          {/* CONDITIONAL TABLE LAYOUT (Aluminum vs Accessories) */}
          {isAluminum ? (
            <Table withTableBorder withColumnBorders style={{ fontSize: '10.5px' }}>
              <Table.Thead style={{ backgroundColor: '#f1f3f5' }}>
                <Table.Tr>
                  <Table.Th style={{ width: '35px', textAlign: 'center', padding: '10px 4px' }}>S.NO</Table.Th>
                  <Table.Th style={{ width: '75px', textAlign: 'center', padding: '10px 6px' }}>CODE</Table.Th>
                  <Table.Th style={{ padding: '10px 8px' }}>DESCRIPTION</Table.Th>
                  <Table.Th style={{ width: '60px', textAlign: 'center', padding: '10px 4px' }}>U.WEIGHT</Table.Th>
                  <Table.Th style={{ width: '55px', textAlign: 'center', padding: '10px 4px' }}>LENGTH</Table.Th>
                  <Table.Th style={{ width: '45px', textAlign: 'center', padding: '10px 4px' }}>QTY</Table.Th>
                  <Table.Th style={{ width: '65px', textAlign: 'center', padding: '10px 4px' }}>T.WEIGHT</Table.Th>
                  <Table.Th style={{ width: '65px', textAlign: 'center', padding: '10px 4px' }}>RAL</Table.Th>
                  <Table.Th style={{ width: '85px', textAlign: 'right', padding: '10px 6px' }}>U.PRICE (AED)</Table.Th>
                  <Table.Th style={{ width: '95px', textAlign: 'right', padding: '10px 6px' }}>TOTAL (AED)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lpoData.items?.map((item: LpoItem, idx: number) => {
                  const qty = item.qty || 0;
                  const price = item.price || 0;
                  const unitWeight = item.kg || 0;
                  const length = item.length || 6.0;
                  const totalWeight = unitWeight * length * qty;
                  const lineTotal = totalWeight * price;
                  
                  return (
                    <Table.Tr key={idx}>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 600, padding: '10px 4px' }}>{idx + 1}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.code || '-'}</Table.Td>
                      <Table.Td style={{ padding: '10px 8px' }}>
                        <Text fw={700} size="xs">{item.description || item.itemName}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 4px' }}>{unitWeight.toFixed(2)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 4px' }}>{length.toFixed(1)}m</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 600, padding: '10px 4px' }}>{qty}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 600, padding: '10px 4px' }} c="blue.8">{totalWeight.toFixed(2)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 4px' }}>{item.ral || 'Mill Finish'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', padding: '10px 6px' }}>{price.toFixed(2)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, padding: '10px 6px' }}>{lineTotal.toFixed(2)}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          ) : (
            <Table withTableBorder withColumnBorders style={{ fontSize: '12px' }}>
              <Table.Thead style={{ backgroundColor: '#f1f3f5' }}>
                <Table.Tr>
                  <Table.Th style={{ width: '40px', textAlign: 'center', padding: '10px 6px' }}>S.NO</Table.Th>
                  <Table.Th style={{ width: '85px', textAlign: 'center', padding: '10px 6px' }}>CODE</Table.Th>
                  <Table.Th style={{ padding: '10px 10px' }}>DESCRIPTION & SPECS</Table.Th>
                  <Table.Th style={{ width: '55px', textAlign: 'center', padding: '10px 6px' }}>UNIT</Table.Th>
                  <Table.Th style={{ width: '55px', textAlign: 'center', padding: '10px 6px' }}>QTY</Table.Th>
                  <Table.Th style={{ width: '95px', textAlign: 'right', padding: '10px 10px' }}>PRICE (AED)</Table.Th>
                  <Table.Th style={{ width: '105px', textAlign: 'right', padding: '10px 10px' }}>TOTAL (AED)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lpoData.items?.map((item: LpoItem, idx: number) => {
                  const qty = item.qty || 0;
                  const price = item.price || 0;
                  const lineTotal = qty * price;
                  
                  return (
                    <Table.Tr key={idx}>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 600, padding: '10px 6px' }}>{idx + 1}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.accCode || item.code || '-'}</Table.Td>
                      <Table.Td style={{ padding: '10px 10px' }}>
                        <Text fw={700} size="sm">{item.description || item.itemName}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', padding: '10px 6px' }}>PCS</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontWeight: 600, padding: '10px 6px' }}>{qty}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', padding: '10px 10px' }}>{price.toFixed(2)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, padding: '10px 10px' }}>{lineTotal.toFixed(2)}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
          
          {/* Financial Totals */}
          <Group justify="flex-end" mt={8}>
            <div style={{ width: '260px', border: '1px solid #dee2e6', padding: '10px', fontSize: '11.5px' }}>
              <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text fw={600} size="sm">AED {lpoData.subtotal?.toFixed(2)}</Text></Group>
              <Group justify="space-between" mt={4}><Text size="sm">VAT (5%):</Text><Text fw={600} size="sm">AED {lpoData.vat?.toFixed(2)}</Text></Group>
              <Divider my={5} />
              <Group justify="space-between"><Text size="sm" fw={700}>Grand Total:</Text><Text fw={700} size="sm" c="blue.8">AED {lpoData.total?.toFixed(2)}</Text></Group>
            </div>
          </Group>
          
          {/* Terms & Conditions */}
          <div style={{ fontSize: '11px', marginTop: '14px' }}>
            <Text fw={700} size="sm" mb={3}>Terms & Conditions:</Text>
            <Text size="xs" mb={1}>1. Please mention the LPO Number on all invoices and delivery notes.</Text>
            <Text size="xs">2. Items must be delivered in good condition as per specified standards.</Text>
          </div>
          
          {/* Signatures & Stamps Footer */}
          <Group justify="space-between" align="flex-start" style={{ marginTop: '18px', fontSize: '11px' }}>
            <div style={{ textAlign: 'center' }}>
              {/* Shows Requestor Name */}
              <Text fw={700} size="sm" mt={14}>{capitalizedRequestor}</Text>
              <div style={{ borderTop: '1px solid #000', width: '160px' }}></div>
              <Text size="xs" c="dimmed" mt={3}>Prepared By</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '140px' }}>
                <Image
                  src={`/images/${purchaserSignatureName}-sign.png`}
                  alt="Authorized Signature & Stamp"
                  width={140}
                  height={120}
                  unoptimized
                  style={{ objectFit: 'contain', marginBottom: '50px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/admin-sign.png';
                  }}
                />
              </div>
              <div style={{ borderTop: '1px solid #000', width: '200px', marginTop: '2px' }}></div>
              <Text size="xs" c="dimmed" mt={3}>Authorized Signature & Stamp</Text>
            </div>
          </Group>
        </Stack>
        
        {/* FOOTER IMAGE ASSET */}
        <div style={{ width: '100%', textAlign: 'center', marginTop: '12px', position: 'relative', height: '100px' }}>
          <Image
            src="/images/lpo-footer.png"
            alt="CIJI Official Footer"
            fill
            unoptimized
            style={{ objectFit: 'contain' }}
          />
        </div>
      </Paper>
      
      {/* Strict Print CSS Rules */}
      <style jsx global>{`
          @media print {
              html, body {
                  background-color: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
              }
              body {
                  visibility: hidden;
              }
              .a4-sheet {
                  visibility: visible;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  min-height: 297mm !important;
                  margin: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 8mm !important;
              }
              .no-print {
                  display: none !important;
              }
              @page {
                  size: A4 portrait;
                  margin: 0;
              }
          }
      `}</style>
    </Container>
  );
}

export default function OfficialLpoPrintPage() {
  return (
    <Suspense
      fallback={
        <Center p="xl" style={{ height: '50vh' }}>
          <Loader color="myColor" size="lg" />
        </Center>
      }
    >
      <OfficialLpoPrintContent />
    </Suspense>
  );
}