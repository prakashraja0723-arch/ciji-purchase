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
  ActionIcon,
  Loader,
  Center,
  Stepper,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { doc, getDoc, updateDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RequestItem, LpoData, SupplierDbItem, AluDbInfo } from '@/app/(pages)/lpo/types';
import { Section1SupplierInfo, Section2ItemsPricing, Section3ReviewSummary } from '@/components/LpoSteps';

function LpoReviseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lpoId = searchParams.get('lpoId');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const [errorModalOpened, { open: openErrorModal, close: closeErrorModal }] = useDisclosure(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
  
  const triggerError = useCallback((title: string, message: string) => {
    setErrorMessage({ title, message });
    openErrorModal();
  }, [openErrorModal]);
  
  const [data, setData] = useState<LpoData | null>(null);
  const [dbSuppliers, setDbSuppliers] = useState<SupplierDbItem[]>([]);
  
  const [supplierName, setSupplierName] = useState('');
  const [supplierTrn, setSupplierTrn] = useState('');
  const [lpoNoInput, setLpoNoInput] = useState('');
  const [projectName, setProjectName] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  
  const [orderQuantities, setOrderQuantities] = useState<{ [index: number]: number }>({});
  const [itemPrices, setItemPrices] = useState<{ [index: number]: number }>({});
  const [itemWeights, setItemWeights] = useState<{ [index: number]: number }>({});
  const [itemLengths, setItemLengths] = useState<{ [index: number]: number }>({});
  
  const fetchRevisionData = useCallback(async () => {
    if (!lpoId) {
      setLoading(false);
      return;
    }
    try {
      const sups: SupplierDbItem[] = [];
      const supSnap = await getDocs(collection(db, 'suppliers'));
      supSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        sups.push({
          id: docSnap.id,
          vendorName: typeof d.vendorName === 'string' ? d.vendorName : '',
          trn: typeof d.trn === 'string' ? d.trn : '',
        });
      });
      setDbSuppliers(sups);
      
      const aluDbWeights: { [code: string]: AluDbInfo } = {};
      const aluSnap = await getDocs(collection(db, 'aluminum'));
      aluSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.code) {
          aluDbWeights[String(d.code).trim().toUpperCase()] = {
            weightPerMeter: Number(d.weightPerMeter) || Number(d.kg) || 0,
            length: Number(d.length) || 6.0,
          };
        }
      });
      
      const lpoSnap = await getDoc(doc(db, 'lpos', lpoId));
      if (lpoSnap.exists()) {
        const lpoData = lpoSnap.data() as LpoData;
        setData(lpoData);
        setSupplierName(lpoData.supplierName || '');
        setSupplierTrn(lpoData.supplierTrn || '');
        setProjectName(lpoData.projectName || '');
        
        const currentLpoNo = lpoData.lpoNo || 'LPO-2026-001';
        const baseNo = currentLpoNo.replace(/-R\d+$/, '');
        
        const revMatch = currentLpoNo.match(/-R(\d+)$/);
        const nextRevNum = revMatch ? parseInt(revMatch[1], 10) + 1 : 1;
        
        const revisedNo = `${baseNo}-R${nextRevNum}`;
        setLpoNoInput(revisedNo);
        
        const initialQtys: { [index: number]: number } = {};
        const initialPrices: { [index: number]: number } = {};
        const initialWeights: { [index: number]: number } = {};
        const initialLengths: { [index: number]: number } = {};
        
        lpoData.items.forEach((item: RequestItem, idx: number) => {
          const dbInfo = aluDbWeights[(item.code || '').trim().toUpperCase()];
          initialQtys[idx] = item.qty;
          initialPrices[idx] = item.price || 0;
          initialLengths[idx] = item.length || dbInfo?.length || 6.0;
          initialWeights[idx] = dbInfo?.weightPerMeter || item.kg || 0;
        });
        
        setOrderQuantities(initialQtys);
        setItemPrices(initialPrices);
        setItemWeights(initialWeights);
        setItemLengths(initialLengths);
      }
    } catch (error) {
      console.error('Error fetching LPO for revision:', error);
      triggerError('Loading Error', 'Failed to load LPO details for revision.');
    } finally {
      setLoading(false);
    }
  }, [lpoId, triggerError]);
  
  useEffect(() => {
    fetchRevisionData().catch((err) => console.error(err));
  }, [fetchRevisionData]);
  
  const handleSupplierSelect = (selectedValue: string) => {
    setSupplierName(selectedValue);
    const matched = dbSuppliers.find((s) => s.vendorName === selectedValue || `${s.vendorName} (${s.trn})` === selectedValue);
    if (matched) {
      if (matched.vendorName) setSupplierName(matched.vendorName);
      if (matched.trn) setSupplierTrn(matched.trn);
    }
  };

  const calculateTotals = useCallback(() => {
    if (!data?.items) return { subtotal: 0, vat: 0, total: 0 };
    let subtotal = 0;
    const isAluminum = data.requestType === 'Aluminum';
    
    data.items.forEach((item: RequestItem, idx: number) => {
      const qty = orderQuantities[idx] || 0;
      const price = itemPrices[idx] || 0;
      if (isAluminum) {
        const unitWeight = itemWeights[idx] || 0;
        const length = itemLengths[idx] || 6.0;
        const totalWeight = length > 0 ? (unitWeight / length) * length * qty : unitWeight * qty;
        subtotal += totalWeight * price;
      } else {
        subtotal += qty * price;
      }
    });
    
    const vat = subtotal * 0.05;
    return { subtotal, vat, total: subtotal + vat };
  }, [data, orderQuantities, itemPrices, itemWeights, itemLengths]);
  
  const { subtotal, vat, total } = calculateTotals();
  
  const validateSection1 = useCallback(() => {
    if (!supplierName.trim() || !supplierTrn.trim() || !projectName.trim() || !lpoNoInput.trim() || !revisionReason.trim()) {
      triggerError('Incomplete Details', 'Please fill out all fields in Section 1 including the Revision Reason/Notes.');
      return false;
    }
    return true;
  }, [supplierName, supplierTrn, projectName, lpoNoInput, revisionReason, triggerError]);

  const validateSection2 = useCallback(() => {
    if (!data || !data.items) return false;
    let hasOrdered = false;
    for (let i = 0; i < data.items.length; i++) {
      const qty = orderQuantities[i] || 0;
      const price = itemPrices[i] || 0;
      if (qty > 0) {
        hasOrdered = true;
        if (price <= 0) {
          triggerError('Price Required', `Item #${i + 1} requires a valid unit price greater than 0.`);
          return false;
        }
      }
    }
    if (!hasOrdered) {
      triggerError('Zero Items', 'Please specify an order quantity for at least one item.');
      return false;
    }
    return true;
  }, [data, orderQuantities, itemPrices, triggerError]);

  const handleSaveRevision = async () => {
    if (!data || !lpoId || submitting) return;
    if (!validateSection1() || !validateSection2()) return;

    setSubmitting(true);
    try {
      const isAluminum = data.requestType === 'Aluminum';
      const processedItems = data.items.map((item: RequestItem, idx: number) => {
        const qty = orderQuantities[idx] ?? item.qty;
        const unitWeight = itemWeights[idx] ?? item.kg ?? 0;
        const length = itemLengths[idx] ?? item.length ?? 6.0;
        const price = itemPrices[idx] || 0;
        const totalWeight = isAluminum && length > 0 ? (unitWeight / length) * length * qty : 0;
        
        return {
          ...item,
          qty,
          orderedQty: qty,
          price,
          kg: unitWeight,
          length,
          totalWeight,
          lineTotal: isAluminum ? totalWeight * price : qty * price,
        };
      });

      await updateDoc(doc(db, 'lpos', lpoId), {
        lpoNo: lpoNoInput,
        supplierName,
        supplierTrn,
        revisionReason,
        subtotal,
        vat,
        total,
        items: processedItems,
        updatedAt: Timestamp.now(),
      });

      router.push('/lpo');
    } catch (error) {
      console.error('Error saving LPO revision:', error);
      triggerError('Database Error', 'Failed to save LPO revision to Firestore.');
      setSubmitting(false);
    }
  };
  
  if (loading) return <Center p="xl" style={{ height: '50vh' }}><Loader color="myColor" size="lg" /></Center>;
  if (!lpoId || !data) return <Container size="lg" p="xl"><Text c="red" fw={600}>Original LPO record not found for revision.</Text></Container>;
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon variant="subtle" color="gray" disabled={submitting} onClick={() => router.push('/lpo')}><IconArrowLeft size={18} /></ActionIcon>
              <div>
                <Title order={3}>Revise LPO: {lpoNoInput}</Title>
                <Text size="xs" c="dimmed">Project: {projectName} | Revision Workflow</Text>
              </div>
            </Group>
            <Button variant="default" disabled={submitting} onClick={() => router.push('/lpo')}>Cancel</Button>
          </Group>
        </Paper>
        
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Stepper active={activeStep} onStepClick={(step: number) => {
            if (step > activeStep) {
              if (activeStep === 0 && !validateSection1()) return;
              if (activeStep === 1 && !validateSection2()) return;
            }
            setActiveStep(step);
          }} color="myColor" size="sm">
            <Stepper.Step label="Section 1" description="Supplier & Revision Reason" />
            <Stepper.Step label="Section 2" description="Items & Pricing" />
            <Stepper.Step label="Section 3" description="Review & Summary" />
          </Stepper>
        </Paper>
        
        {activeStep === 0 && (
          <Section1SupplierInfo
            supplierName={supplierName}
            setSupplierName={setSupplierName}
            supplierTrn={supplierTrn}
            setSupplierTrn={setSupplierTrn}
            projectName={projectName}
            setProjectName={setProjectName}
            lpoNoInput={lpoNoInput}
            setLpoNoInput={setLpoNoInput}
            revisionReason={revisionReason}
            setRevisionReason={setRevisionReason}
            isRevision={true}
            dbSuppliers={dbSuppliers}
            handleSupplierSelect={handleSupplierSelect}
            onNext={() => { if (validateSection1()) setActiveStep(1); }}
          />
        )}
        
        {activeStep === 1 && (
          <Section2ItemsPricing
            data={data}
            orderQuantities={orderQuantities}
            itemPrices={itemPrices}
            itemWeights={itemWeights}
            itemLengths={itemLengths}
            handleWeightChange={(idx: number, val: number | string) => setItemWeights(p => ({ ...p, [idx]: Number(val) || 0 }))}
            handleLengthChange={(idx: number, val: number | string) => setItemLengths(p => ({ ...p, [idx]: Number(val) || 0 }))}
            handleQtyChange={(idx: number, val: number | string) => setOrderQuantities(p => ({ ...p, [idx]: Number(val) || 0 }))}
            handlePriceChange={(idx: number, val: number | string) => setItemPrices(p => ({ ...p, [idx]: Number(val) || 0 }))}
            onBack={() => setActiveStep(0)}
            onNext={() => { if (validateSection2()) setActiveStep(2); }}
          />
        )}
        
        {activeStep === 2 && (
          <Section3ReviewSummary
            data={data}
            supplierName={supplierName}
            supplierTrn={supplierTrn}
            lpoNoInput={lpoNoInput}
            projectName={projectName}
            orderQuantities={orderQuantities}
            itemPrices={itemPrices}
            itemWeights={itemWeights}
            itemLengths={itemLengths}
            subtotal={subtotal}
            vat={vat}
            total={total}
            submitting={submitting}
            onBack={() => setActiveStep(1)}
            onSubmit={handleSaveRevision}
          />
        )}
      </Stack>
      
      <Modal opened={errorModalOpened} onClose={closeErrorModal} title={<Group gap="xs"><IconAlertCircle size={22} color="var(--mantine-color-red-7)" /><Text fw={700} c="red.7">{errorMessage.title}</Text></Group>} radius="md" centered>
        <Stack gap="md">
          <Paper p="md" withBorder bg="red.0" radius="sm"><Text size="sm" c="red.9" fw={500}>{errorMessage.message}</Text></Paper>
          <Group justify="flex-end" mt="xs"><Button color="red" variant="light" onClick={closeErrorModal}>OK, Got It</Button></Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function LpoRevisePage() {
  return (
    <Suspense fallback={<Center p="xl" style={{ height: '50vh' }}><Loader color="myColor" size="lg" /></Center>}>
      <LpoReviseContent />
    </Suspense>
  );
}
