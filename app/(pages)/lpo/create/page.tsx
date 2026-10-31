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
  TextInput,
  NumberInput,
  Select,
  Autocomplete,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { doc, getDoc, updateDoc, addDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RequestItem, LpoData, SupplierDbItem, AluDbInfo } from '@/app/(pages)/lpo/types';
import { Section1SupplierInfo, Section2ItemsPricing, Section3ReviewSummary } from '@/components/LpoSteps';

function AluminumAndAccessoriesLpoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('id');
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
  const [isRevision, setIsRevision] = useState(false);
  const [isDirectCreation, setIsDirectCreation] = useState(false);
  const [dbSuppliers, setDbSuppliers] = useState<SupplierDbItem[]>([]);
  
  const [dbInventoryItems, setDbInventoryItems] = useState<{ name: string; code: string; unit?: string }[]>([]);
  const [dbAluminumItems, setDbAluminumItems] = useState<{ description: string; code: string; weightPerMeter?: number; length?: number }[]>([]);
  
  const [supplierName, setSupplierName] = useState('');
  const [supplierTrn, setSupplierTrn] = useState('');
  const [lpoNoInput, setLpoNoInput] = useState('');
  const [projectName, setProjectName] = useState('');
  
  const [orderQuantities, setOrderQuantities] = useState<{ [index: number]: number }>({});
  const [itemPrices, setItemPrices] = useState<{ [index: number]: number }>({});
  const [itemWeights, setItemWeights] = useState<{ [index: number]: number }>({});
  const [itemLengths, setItemLengths] = useState<{ [index: number]: number }>({});
  
  const [directItems, setDirectItems] = useState<RequestItem[]>([]);
  const [newItemType, setNewItemType] = useState<'Accessories' | 'Aluminum'>('Accessories');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemQty, setNewItemQty] = useState<number | ''>(1);
  const [newItemPrice, setNewItemPrice] = useState<number | ''>(0);
  const [newItemWeight, setNewItemWeight] = useState<number | ''>(0);
  const [newItemLength, setNewItemLength] = useState<number | ''>(6.0);
  
  const fetchData = useCallback(async () => {
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
      
      const invSnap = await getDocs(collection(db, 'inventory'));
      const invList = invSnap.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          name: typeof d.name === 'string' ? d.name : '',
          code: typeof d.code === 'string' ? d.code : '',
          unit: typeof d.unit === 'string' ? d.unit : 'PCS',
        };
      });
      setDbInventoryItems(invList);
      
      const aluSnap = await getDocs(collection(db, 'aluminum'));
      const aluList = aluSnap.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          description: typeof d.description === 'string' ? d.description : (d.name || ''),
          code: typeof d.code === 'string' ? d.code : '',
          weightPerMeter: Number(d.weightPerMeter) || Number(d.kg) || 0,
          length: Number(d.length) || 6.0,
        };
      });
      setDbAluminumItems(aluList);
      
      const aluDbWeights: { [code: string]: AluDbInfo } = {};
      aluList.forEach(item => {
        if (item.code) {
          aluDbWeights[item.code.trim().toUpperCase()] = {
            weightPerMeter: item.weightPerMeter || 0,
            length: item.length || 6.0,
          };
        }
      });
      
      let nextLpoNo = 'LPO-2026-001';
      const lpoSnapshot = await getDocs(collection(db, 'lpos'));
      let maxNum = 0;
      lpoSnapshot.docs.forEach((docSnap) => {
        const matches = String(docSnap.data().lpoNo || '').match(/(\d+)$/);
        if (matches) {
          const num = parseInt(matches[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      if (maxNum > 0) {
        nextLpoNo = `LPO-${new Date().getFullYear()}-${String(maxNum + 1).padStart(3, '0')}`;
      }
      setLpoNoInput(nextLpoNo);
      
      if (lpoId) {
        setIsRevision(true);
        setIsDirectCreation(false);
        const lpoSnap = await getDoc(doc(db, 'lpos', lpoId));
        if (lpoSnap.exists()) {
          const lpoData = lpoSnap.data() as LpoData;
          setData(lpoData);
          setLpoNoInput(lpoData.lpoNo || nextLpoNo);
          setSupplierName(lpoData.supplierName || '');
          setSupplierTrn(lpoData.supplierTrn || '');
          setProjectName(lpoData.projectName || '');
          
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
      } else if (requestId) {
        setIsRevision(false);
        setIsDirectCreation(false);
        const reqSnap = await getDoc(doc(db, 'requests', requestId));
        if (reqSnap.exists()) {
          const reqData = reqSnap.data() as LpoData;
          setData(reqData);
          setProjectName(reqData.projectName || '');
          
          const initialQtys: { [index: number]: number } = {};
          const initialPrices: { [index: number]: number } = {};
          const initialWeights: { [index: number]: number } = {};
          const initialLengths: { [index: number]: number } = {};
          
          reqData.items.forEach((item: RequestItem, idx: number) => {
            const dbInfo = aluDbWeights[(item.code || '').trim().toUpperCase()];
            initialQtys[idx] = item.qty;
            initialPrices[idx] = 0;
            initialLengths[idx] = item.length || dbInfo?.length || 6.0;
            initialWeights[idx] = dbInfo?.weightPerMeter || item.kg || 0;
          });
          
          setOrderQuantities(initialQtys);
          setItemPrices(initialPrices);
          setItemWeights(initialWeights);
          setItemLengths(initialLengths);
        }
      } else {
        setIsDirectCreation(true);
        setIsRevision(false);
        setData({
          materialRequestNo: 'DIRECT-LPO',
          projectName: 'General Procurement',
          requestType: 'Accessories',
          items: [],
        });
        setProjectName('General Procurement');
      }
    } catch (error) {
      console.error('Error fetching data for LPO form:', error);
      triggerError('Data Loading Error', 'Failed to load requisition or supplier database records.');
    } finally {
      setLoading(false);
    }
  }, [requestId, lpoId, triggerError]);
  
  useEffect(() => {
    fetchData().catch((err) => console.error(err));
  }, [fetchData]);
  
  const handleSupplierSelect = (selectedValue: string) => {
    setSupplierName(selectedValue);
    const matched = dbSuppliers.find((s) => s.vendorName === selectedValue || `${s.vendorName} (${s.trn})` === selectedValue);
    if (matched) {
      if (matched.vendorName) setSupplierName(matched.vendorName);
      if (matched.trn) setSupplierTrn(matched.trn);
    }
  };
  
  const handleItemDescriptionSelect = (selectedValue: string) => {
    setNewItemDesc(selectedValue);
    if (newItemType === 'Accessories') {
      const match = dbInventoryItems.find(i => i.name === selectedValue);
      if (match && match.code) {
        setNewItemCode(match.code);
      }
    } else {
      const match = dbAluminumItems.find(i => i.description === selectedValue);
      if (match) {
        if (match.code) setNewItemCode(match.code);
        if (match.weightPerMeter) setNewItemWeight(match.weightPerMeter);
        if (match.length) setNewItemLength(match.length);
      }
    }
  };
  
  const handleAddDirectItem = () => {
    if (!newItemDesc.trim() || !newItemQty || newItemQty <= 0) {
      triggerError('Invalid Item', 'Please provide a valid item description and quantity greater than zero.');
      return;
    }
    const newItem: RequestItem = {
      itemType: newItemType,
      itemName: newItemDesc,
      description: newItemDesc,
      code: newItemCode,
      accCode: newItemCode,
      qty: Number(newItemQty),
      price: Number(newItemPrice) || 0,
      kg: Number(newItemWeight) || 0,
      length: Number(newItemLength) || 6.0,
      itemStatus: 'Ordered',
    };
    
    const updatedDirectItems = [...directItems, newItem];
    setDirectItems(updatedDirectItems);
    
    const determinedType = updatedDirectItems.some(i => i.itemType === 'Aluminum') ? 'Aluminum' : 'Accessories';
    setData(prev => prev ? { ...prev, requestType: determinedType, items: updatedDirectItems } : null);
    
    const newIdx = updatedDirectItems.length - 1;
    setOrderQuantities(p => ({ ...p, [newIdx]: Number(newItemQty) }));
    setItemPrices(p => ({ ...p, [newIdx]: Number(newItemPrice) || 0 }));
    setItemWeights(p => ({ ...p, [newIdx]: Number(newItemWeight) || 0 }));
    setItemLengths(p => ({ ...p, [newIdx]: Number(newItemLength) || 6.0 }));
    
    setNewItemDesc('');
    setNewItemCode('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemWeight(0);
    setNewItemLength(6.0);
  };
  
  const handleRemoveDirectItem = (idxToRemove: number) => {
    const updatedDirectItems = directItems.filter((_, idx) => idx !== idxToRemove);
    setDirectItems(updatedDirectItems);
    const determinedType = updatedDirectItems.some(i => i.itemType === 'Aluminum') ? 'Aluminum' : 'Accessories';
    setData(prev => prev ? { ...prev, requestType: determinedType, items: updatedDirectItems } : null);
  };
  
  const calculateTotals = useCallback(() => {
    const itemsList = isDirectCreation ? directItems : data?.items;
    if (!itemsList || itemsList.length === 0) return { subtotal: 0, vat: 0, total: 0 };
    let subtotal = 0;
    
    itemsList.forEach((item: RequestItem, idx: number) => {
      const qty = orderQuantities[idx] || item.qty || 0;
      const price = itemPrices[idx] || item.price || 0;
      const isAlu = isDirectCreation ? item.itemType === 'Aluminum' : data?.requestType === 'Aluminum';
      
      if (isAlu) {
        const unitWeight = itemWeights[idx] || item.kg || 0;
        const length = itemLengths[idx] || item.length || 6.0;
        const totalWeight = length > 0 ? unitWeight * length * qty : unitWeight * qty;
        subtotal += totalWeight * price;
      } else {
        subtotal += qty * price;
      }
    });
    
    const vat = subtotal * 0.05;
    return { subtotal, vat, total: subtotal + vat };
  }, [data, directItems, isDirectCreation, orderQuantities, itemPrices, itemWeights, itemLengths]);
  
  const { subtotal, vat, total } = calculateTotals();
  
  const validateSection1 = useCallback(() => {
    if (!supplierName.trim()) {
      triggerError('Supplier Name Required', 'Please enter or select a valid Supplier Name before proceeding.');
      return false;
    }
    if (!supplierTrn.trim()) {
      triggerError('Supplier TRN Required', 'Please provide the Supplier Tax Registration Number (TRN).');
      return false;
    }
    if (!projectName.trim()) {
      triggerError('Project Name Required', 'Please verify that a Project Name is specified.');
      return false;
    }
    if (!lpoNoInput.trim()) {
      triggerError('LPO Number Required', 'An LPO number is mandatory to continue.');
      return false;
    }
    return true;
  }, [supplierName, supplierTrn, projectName, lpoNoInput, triggerError]);
  
  const validateSection2 = useCallback(() => {
    const itemsList = isDirectCreation ? directItems : data?.items;
    if (!itemsList || itemsList.length === 0) {
      triggerError('No Items Added', 'Please add at least one item to the LPO order batch.');
      return false;
    }
    
    let hasAtLeastOneOrdered = false;
    for (let i = 0; i < itemsList.length; i++) {
      const qty = orderQuantities[i] ?? itemsList[i].qty;
      const price = itemPrices[i] ?? itemsList[i].price;
      
      if (qty === undefined || qty <= 0) {
        triggerError('Invalid Quantity', `Item #${i + 1} has an invalid or zero order quantity.`);
        return false;
      }
      if (price === undefined || price <= 0) {
        triggerError('Missing Unit Price', `Item #${i + 1} lacks a valid unit price greater than 0.`);
        return false;
      }
      hasAtLeastOneOrdered = true;
    }
    
    if (!hasAtLeastOneOrdered) {
      triggerError('Zero Items Ordered', 'Please specify valid items with quantity and price.');
      return false;
    }
    return true;
  }, [data, directItems, isDirectCreation, orderQuantities, itemPrices, triggerError]);
  
  const handleFinalSubmit = async () => {
    if (!data || submitting) return;
    if (!validateSection1() || !validateSection2()) return;
    
    if (subtotal <= 0 || total <= 0) {
      triggerError('Invalid Financial Total', 'The calculated grand total must be greater than zero.');
      return;
    }
    
    setSubmitting(true);
    try {
      const storedUser = localStorage.getItem('ciji_user');
      let purchaserName = 'Admin';
      let purchaserUsername = 'admin';
      if (storedUser) {
        try {
          const currentUser = JSON.parse(storedUser);
          purchaserName = currentUser.name || 'Admin';
          purchaserUsername = currentUser.username || 'admin';
        } catch (err) {
          console.error('Failed to parse ciji_user session:', err);
        }
      }
      
      const itemsList = isDirectCreation ? directItems : data.items;
      const processedItems = itemsList.map((item: RequestItem, idx: number) => {
        const qty = orderQuantities[idx] ?? item.qty;
        const unitWeight = itemWeights[idx] ?? item.kg ?? 0;
        const length = itemLengths[idx] ?? item.length ?? 6.0;
        const price = itemPrices[idx] ?? item.price ?? 0;
        const isAlu = isDirectCreation ? item.itemType === 'Aluminum' : data.requestType === 'Aluminum';
        
        const totalWeight = isAlu && length > 0 ? unitWeight * length * qty : 0;
        const lineTotal = isAlu ? totalWeight * price : qty * price;
        
        return {
          ...item,
          qty,
          orderedQty: qty,
          price,
          kg: unitWeight,
          length,
          totalWeight,
          lineTotal,
          itemStatus: 'Ordered',
        };
      });
      
      if (isRevision && lpoId) {
        await updateDoc(doc(db, 'lpos', lpoId), {
          lpoNo: lpoNoInput,
          supplierName,
          supplierTrn,
          subtotal,
          vat,
          total,
          items: processedItems,
          purchaserName,
          purchaserUsername,
        });
      } else {
        await addDoc(collection(db, 'lpos'), {
          lpoNo: lpoNoInput,
          materialRequestNo: isDirectCreation ? `DIR-${Math.floor(1000 + Math.random() * 9000)}` : data.materialRequestNo,
          projectName,
          supplierName,
          supplierTrn,
          requestType: isDirectCreation ? (directItems.some(i => i.itemType === 'Aluminum') ? 'Aluminum' : 'Accessories') : data.requestType,
          storekeeperUid: isDirectCreation ? purchaserUsername : (data.storekeeperUid || 'Storekeeper'),
          purchaserName,
          purchaserUsername,
          subtotal,
          vat,
          total,
          items: processedItems,
          createdAt: Timestamp.now(),
        });
        
        await addDoc(collection(db, 'goodsReceipts'), {
          lpoNo: lpoNoInput,
          materialRequestNo: isDirectCreation ? `DIR-${Math.floor(1000 + Math.random() * 9000)}` : data.materialRequestNo,
          projectName,
          items: processedItems.map((itm: RequestItem) => ({ ...itm, receivedQty: 0 })),
          status: 'Pending Delivery',
          createdAt: Timestamp.now(),
        });
        
        if (requestId) {
          const originalDocRef = doc(db, 'requests', requestId);
          await updateDoc(originalDocRef, { status: 'Completed', items: processedItems });
        }
      }
      
      router.push('/lpo');
    } catch (error) {
      console.error(error);
      triggerError('Database Saving Error', 'Failed to write LPO data to Firestore. Please check your connection and try again.');
      setSubmitting(false);
    }
  };
  
  if (loading) return <Center p="xl" style={{ height: '50vh' }}><Loader color="myColor" size="lg" /></Center>;
  if (!data) return <Container size="lg" p="xl"><Text c="red" fw={600}>Record not found.</Text></Container>;
  
  return (
    <Container size="lg" p={0} style={{ width: '100%' }}>
      <Stack gap="lg">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon variant="subtle" color="gray" disabled={submitting} onClick={() => router.push('/lpo')}><IconArrowLeft size={18} /></ActionIcon>
              <div>
                <Title order={3}>
                  {isRevision ? `Revise LPO: ${data.lpoNo}` : isDirectCreation ? 'Direct LPO Creation (Urgent Requirement)' : `Issue LPO: ${data.materialRequestNo}`}
                </Title>
                <Text size="xs" c="dimmed">Project: {projectName} | Mode: {isDirectCreation ? 'Direct Ad-hoc Order' : 'Requisition Match'}</Text>
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
            <Stepper.Step label="Section 1" description="Supplier & Details" />
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
            dbSuppliers={dbSuppliers}
            handleSupplierSelect={handleSupplierSelect}
            onNext={() => {
              if (validateSection1()) {
                setActiveStep(1);
              }
            }}
          />
        )}
        
        {activeStep === 1 && (
          <Stack gap="md">
            {isDirectCreation && (
              <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                <Stack gap="sm">
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Add Ad-hoc Item</Text>
                  <Group grow align="flex-end">
                    <Select
                      label="Item Type"
                      data={['Accessories', 'Aluminum']}
                      value={newItemType}
                      onChange={(v) => {
                        if (v) {
                          setNewItemType(v as 'Accessories' | 'Aluminum');
                          setNewItemDesc('');
                          setNewItemCode('');
                        }
                      }}
                    />
                    <Autocomplete
                      label="Description"
                      placeholder="Type to search database..."
                      data={newItemType === 'Accessories' ? dbInventoryItems.map(i => i.name) : dbAluminumItems.map(i => i.description)}
                      value={newItemDesc}
                      onChange={setNewItemDesc}
                      onOptionSubmit={handleItemDescriptionSelect}
                    />
                    <TextInput
                      label="Code / Serial"
                      placeholder="e.g. ACC-01"
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                    />
                  </Group>
                  <Group grow align="flex-end">
                    <NumberInput
                      label="Quantity"
                      min={1}
                      value={newItemQty}
                      onChange={(val) => setNewItemQty(val === '' ? '' : Number(val))}
                    />
                    <NumberInput
                      label="Unit Price (AED)"
                      min={0}
                      decimalScale={2}
                      value={newItemPrice}
                      onChange={(val) => setNewItemPrice(val === '' ? '' : Number(val))}
                    />
                    {newItemType === 'Aluminum' && (
                      <>
                        <NumberInput
                          label="Unit Wt (kg)"
                          min={0}
                          decimalScale={2}
                          value={newItemWeight}
                          onChange={(val) => setNewItemWeight(val === '' ? '' : Number(val))}
                        />
                        <NumberInput
                          label="Length (m)"
                          min={0}
                          decimalScale={1}
                          value={newItemLength}
                          onChange={(val) => setNewItemLength(val === '' ? '' : Number(val))}
                        />
                      </>
                    )}
                    <Button color="myColor" leftSection={<IconPlus size={16} />} onClick={handleAddDirectItem}>
                      Add Item
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
            
            {isDirectCreation && directItems.length > 0 && (
              <Paper p="md" radius="md" withBorder>
                <Text size="sm" fw={600} mb="xs">Added Ad-hoc Items ({directItems.length})</Text>
                <Stack gap="xs">
                  {directItems.map((di, idx) => (
                    <Group key={idx} justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                      <div>
                        <Text fw={600} size="sm">{di.description} ({di.itemType})</Text>
                        <Text size="xs" c="dimmed">Code: {di.code} | Qty: {di.qty} | Price: {di.price} AED</Text>
                      </div>
                      <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveDirectItem(idx)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}
            
            <Section2ItemsPricing
              data={{ ...data, items: isDirectCreation ? directItems : data.items }}
              orderQuantities={orderQuantities}
              itemPrices={itemPrices}
              itemWeights={itemWeights}
              itemLengths={itemLengths}
              handleWeightChange={(idx, val) => setItemWeights(p => ({ ...p, [idx]: Number(val) || 0 }))}
              handleLengthChange={(idx, val) => setItemLengths(p => ({ ...p, [idx]: Number(val) || 6.0 }))}
              handleQtyChange={(idx, val) => setOrderQuantities(p => ({ ...p, [idx]: Number(val) || 1 }))}
              handlePriceChange={(idx, val) => setItemPrices(p => ({ ...p, [idx]: Number(val) || 0 }))}
              onBack={() => setActiveStep(0)}
              onNext={() => {
                if (validateSection2()) setActiveStep(2);
              }}
            />
          </Stack>
        )}
        
        {activeStep === 2 && (
          <Section3ReviewSummary
            data={{ ...data, items: isDirectCreation ? directItems : data.items }}
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
            onSubmit={handleFinalSubmit}
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

export default function AluminumAndAccessoriesLpoPage() {
  return (
    <Suspense fallback={<Center p="xl" style={{ height: '50vh' }}><Loader color="myColor" size="lg" /></Center>}>
      <AluminumAndAccessoriesLpoContent />
    </Suspense>
  );
}