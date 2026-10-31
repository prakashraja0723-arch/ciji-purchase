'use client';

import React from 'react';
import {
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Table,
  TextInput,
  NumberInput,
  Divider,
  Badge,
  Autocomplete,
  Loader,
} from '@mantine/core';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { RequestItem, SupplierDbItem, LpoData } from '@/app/(pages)/lpo/types';

interface Section1Props {
  supplierName: string;
  setSupplierName: (val: string) => void;
  supplierTrn: string;
  setSupplierTrn: (val: string) => void;
  projectName: string;
  setProjectName: (val: string) => void;
  lpoNoInput: string;
  setLpoNoInput: (val: string) => void;
  dbSuppliers: SupplierDbItem[];
  handleSupplierSelect: (val: string) => void;
  onNext: () => void;
}

export function Section1SupplierInfo({
                                       supplierName,
                                       setSupplierName,
                                       supplierTrn,
                                       setSupplierTrn,
                                       projectName,
                                       setProjectName,
                                       lpoNoInput,
                                       setLpoNoInput,
                                       dbSuppliers,
                                       handleSupplierSelect,
                                       onNext,
                                     }: Section1Props) {
  return (
    <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
      <Stack gap="md">
        <Title order={5}>Section 1: Supplier & Project Information</Title>
        <Text size="xs" c="dimmed">Type to search registered vendors from database or enter new credentials.</Text>
        
        <Group grow>
          <Autocomplete
            label="Supplier Name"
            placeholder="Type vendor name to search..."
            data={dbSuppliers.map((s) => s.vendorName)}
            value={supplierName}
            onChange={setSupplierName}
            onOptionSubmit={handleSupplierSelect}
            required
          />
          <TextInput
            label="Supplier TRN No"
            placeholder="e.g., TRN-100293847500003"
            value={supplierTrn}
            onChange={(e) => setSupplierTrn(e.target.value)}
            required
          />
        </Group>
        
        <Group grow>
          <TextInput
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
          <TextInput
            label="LPO Number"
            value={lpoNoInput}
            onChange={(e) => setLpoNoInput(e.target.value)}
            required
          />
        </Group>
        
        <Group justify="flex-end" mt="md">
          <Button color="myColor" rightSection={<IconArrowRight size={16} />} onClick={onNext}>
            Next: Items & Pricing
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

interface Section2Props {
  data: LpoData;
  orderQuantities: { [index: number]: number };
  itemPrices: { [index: number]: number };
  itemWeights: { [index: number]: number };
  itemLengths: { [index: number]: number };
  handleWeightChange: (idx: number, val: number | string) => void;
  handleLengthChange: (idx: number, val: number | string) => void;
  handleQtyChange: (idx: number, val: number | string) => void;
  handlePriceChange: (idx: number, val: number | string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Section2ItemsPricing({
                                       data,
                                       orderQuantities,
                                       itemPrices,
                                       itemWeights,
                                       itemLengths,
                                       handleWeightChange,
                                       handleLengthChange,
                                       handleQtyChange,
                                       handlePriceChange,
                                       onBack,
                                       onNext,
                                     }: Section2Props) {
  const isAluminum = data.requestType === 'Aluminum';
  
  return (
    <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={5}>Section 2: Item Specification & Pricing</Title>
            <Text size="xs" c="dimmed">
              {isAluminum
                ? 'Unit Weight loaded from Database. Calculation: t.weight = unitWeight * length * qty, Total = u.price * t.weight.'
                : 'Editable Qty and Unit Price (AED). Calculation: Qty * Unit Price.'}
            </Text>
          </div>
          <Badge size="lg" variant="light" color={isAluminum ? 'blue' : 'myColor'}>
            {data.requestType} Batch
          </Badge>
        </Group>
        
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '60px' }}>Item No</Table.Th>
              <Table.Th>Serial No (Item Code)</Table.Th>
              <Table.Th>Description</Table.Th>
              {isAluminum && <Table.Th style={{ width: '100px' }}>Unit Wt (DB)</Table.Th>}
              {isAluminum && <Table.Th style={{ width: '90px' }}>Length (M)</Table.Th>}
              {isAluminum && <Table.Th>t.weight</Table.Th>}
              <Table.Th style={{ width: '80px' }}>Qty</Table.Th>
              <Table.Th style={{ width: '110px' }}>Price (AED)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((item, idx) => {
              const qty = orderQuantities[idx] ?? item.qty;
              const unitWeight = itemWeights[idx] ?? item.kg ?? 0;
              const length = itemLengths[idx] ?? item.length ?? 6.0;
              const totalWeight = isAluminum && length > 0 ? unitWeight * length * qty : 0;
              
              return (
                <Table.Tr key={idx}>
                  <Table.Td fw={700}>{idx + 1}</Table.Td>
                  <Table.Td fw={500}>{item.code || item.accCode || '-'}</Table.Td>
                  <Table.Td>{item.description || item.itemName || '-'}</Table.Td>
                  {isAluminum && (
                    <Table.Td>
                      <NumberInput min={0} decimalScale={3} value={unitWeight} onChange={(val) => handleWeightChange(idx, val)} />
                    </Table.Td>
                  )}
                  {isAluminum && (
                    <Table.Td>
                      <NumberInput min={0} decimalScale={2} value={length} onChange={(val) => handleLengthChange(idx, val)} />
                    </Table.Td>
                  )}
                  {isAluminum && <Table.Td fw={700} c="blue.6">{totalWeight.toFixed(2)} kg</Table.Td>}
                  <Table.Td>
                    <NumberInput min={0} max={item.qty} value={qty} onChange={(val) => handleQtyChange(idx, val)} />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput min={0} decimalScale={2} placeholder="0.00" value={itemPrices[idx] ?? 0} onChange={(val) => handlePriceChange(idx, val)} />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        
        <Group justify="space-between" mt="md">
          <Button variant="default" onClick={onBack}>Back</Button>
          <Button color="myColor" rightSection={<IconArrowRight size={16} />} onClick={onNext}>
            Next: Review Summary
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

interface Section3Props {
  data: LpoData;
  supplierName: string;
  supplierTrn: string;
  lpoNoInput: string;
  projectName: string;
  orderQuantities: { [index: number]: number };
  itemPrices: { [index: number]: number };
  itemWeights: { [index: number]: number };
  itemLengths: { [index: number]: number };
  subtotal: number;
  vat: number;
  total: number;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function Section3ReviewSummary({
                                        data,
                                        supplierName,
                                        supplierTrn,
                                        lpoNoInput,
                                        projectName,
                                        orderQuantities,
                                        itemPrices,
                                        itemWeights,
                                        itemLengths,
                                        subtotal,
                                        vat,
                                        total,
                                        submitting,
                                        onBack,
                                        onSubmit,
                                      }: Section3Props) {
  const isAluminum = data.requestType === 'Aluminum';
  
  return (
    <Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
      <Stack gap="md">
        <Title order={5}>Section 3: LPO Financial Review & Confirmation</Title>
        <Text size="xs" c="dimmed">Verify the final billing metrics before dispatching the Local Purchase Order.</Text>
        
        <Group grow align="flex-start">
          <Paper p="md" withBorder radius="sm">
            <Stack gap={6}>
              <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Supplier Details</Text>
              <div><Text size="xs" c="dimmed">Supplier Name:</Text><Text fw={600} size="sm">{supplierName || '-'}</Text></div>
              <div><Text size="xs" c="dimmed">Supplier TRN:</Text><Text fw={600} size="sm">{supplierTrn || '-'}</Text></div>
              <div><Text size="xs" c="dimmed">LPO Number:</Text><Text fw={600} size="sm" c="blue.6">{lpoNoInput}</Text></div>
            </Stack>
          </Paper>
          
          <Paper p="md" withBorder radius="sm">
            <Stack gap={6}>
              <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Order Details (CIJI)</Text>
              <div><Text size="xs" c="dimmed">Project Name:</Text><Text fw={600} size="sm">{projectName || '-'}</Text></div>
              <div><Text size="xs" c="dimmed">Date:</Text><Text fw={600} size="sm">{new Date().toLocaleDateString()}</Text></div>
              <div><Text size="xs" c="dimmed">Company TRN (CIJI):</Text><Text fw={600} size="sm">TRN-CIJI-9988776655</Text></div>
            </Stack>
          </Paper>
        </Group>
        
        <Table withTableBorder mt="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '60px' }}>Item No</Table.Th>
              <Table.Th>Serial No (Item Code)</Table.Th>
              <Table.Th>Description</Table.Th>
              {isAluminum && <Table.Th>Unit Wt (DB)</Table.Th>}
              {isAluminum && <Table.Th>Length</Table.Th>}
              {isAluminum && <Table.Th>t.weight</Table.Th>}
              <Table.Th>Qty</Table.Th>
              <Table.Th>Price (AED)</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Total Amount (AED)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.items.map((item, idx) => {
              const qty = orderQuantities[idx] || 0;
              const price = itemPrices[idx] || 0;
              const unitWeight = itemWeights[idx] || 0;
              const length = itemLengths[idx] || 6.0;
              const totalWeight = isAluminum && length > 0 ? unitWeight * length * qty : 0;
              const lineTotal = isAluminum ? totalWeight * price : qty * price;
              
              return (
                <Table.Tr key={idx}>
                  <Table.Td fw={700}>{idx + 1}</Table.Td>
                  <Table.Td fw={500}>{item.code || item.accCode || '-'}</Table.Td>
                  <Table.Td>{item.description || item.itemName || '-'}</Table.Td>
                  {isAluminum && <Table.Td>{unitWeight} kg</Table.Td>}
                  {isAluminum && <Table.Td>{length} m</Table.Td>}
                  {isAluminum && <Table.Td fw={600}>{totalWeight.toFixed(2)} kg</Table.Td>}
                  <Table.Td>{qty}</Table.Td>
                  <Table.Td>AED {price.toFixed(2)}</Table.Td>
                  <Table.Td fw={700} style={{ textAlign: 'right' }}>AED {lineTotal.toFixed(2)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        
        <Paper p="md" withBorder radius="sm" style={{ width: '340px', marginLeft: 'auto' }}>
          <Stack gap="xs">
            <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text fw={600}>AED {subtotal.toFixed(2)}</Text></Group>
            <Group justify="space-between"><Text size="sm">VAT (5%):</Text><Text fw={600}>AED {vat.toFixed(2)}</Text></Group>
            <Divider />
            <Group justify="space-between"><Text size="md" fw={700}>Grand Total:</Text><Text fw={700} size="md" c="blue.6">AED {total.toFixed(2)}</Text></Group>
          </Stack>
        </Paper>
        
        <Group justify="space-between" mt="md">
          <Button variant="default" disabled={submitting} onClick={onBack}>Back</Button>
          <Button color="myColor" leftSection={submitting ? <Loader size={16} color="white" /> : <IconCheck size={16} />} loading={submitting} onClick={onSubmit}>
            {submitting ? 'Processing LPO...' : 'Confirm & Issue LPO'}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}