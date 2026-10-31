'use client';

import React, { useEffect, useState } from 'react';
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
	TextInput,
	Select,
	NumberInput,
	Divider,
	ActionIcon,
	Modal,
	Badge,
	Autocomplete,
	SegmentedControl,
	Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconPlus, IconTrash, IconCheck, IconAlertCircle, IconPackage, IconInfoCircle, IconSearch } from '@tabler/icons-react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
	id: string;
	itemType: 'Accessories' | 'Aluminum';
	category?: string;
	itemName: string;
	accCode?: string;
	code?: string;
	description?: string;
	length?: number;
	kg?: number;
	qty: number;
	ral?: string;
}

interface InventoryDbItem {
	id: string;
	code?: string;
	name: string;
	category?: string;
	unit?: string;
	systemSeries?: string;
	finish?: string;
	length?: number;
	weightPerMeter?: number;
}

export default function NewRequestPage() {
	const router = useRouter();
	
	// Modal states & Submitting state
	const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
	const [errorModalOpened, { open: openErrorModal, close: closeErrorModal }] = useDisclosure(false);
	const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
	const [submitting, setSubmitting] = useState(false);
	
	// Database Lookup Lists
	const [dbAccessories, setDbAccessories] = useState<InventoryDbItem[]>([]);
	const [dbAluminum, setDbAluminum] = useState<InventoryDbItem[]>([]);
	
	// Section 1: Project & Request metadata
	const [projectName, setProjectName] = useState('');
	const [materialRequestNo, setMaterialRequestNo] = useState('MR-2026-001');
	
	// Active Item Type Selector (Accessories vs Aluminum)
	const [selectedType, setSelectedType] = useState<'Accessories' | 'Aluminum'>('Accessories');
	
	// Accessory Specific Fields
	const [accCode, setAccCode] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [qty, setQty] = useState<number | ''>(10);
	
	// Aluminum Specific Fields
	const [aluCategory, setAluCategory] = useState<string | null>('Aluminium Extrusions - Profiles');
	const [code, setCode] = useState('');
	const [description, setDescription] = useState('');
	const [length, setLength] = useState<number | ''>(6.0);
	const [kg, setKg] = useState<number | ''>('');
	const [ral, setRal] = useState('Mill Finish');
	
	const [itemsList, setItemsList] = useState<RequestItem[]>([]);
	
	// Fetch Inventory, Aluminum data & Auto-increment MR No from Firestore on mount
	useEffect(() => {
		const fetchInitialData = async () => {
			try {
				const invSnap = await getDocs(collection(db, 'inventory'));
				const accs: InventoryDbItem[] = invSnap.docs.map(docSnap => ({
					id: docSnap.id,
					...(docSnap.data() as any)
				}));
				setDbAccessories(accs);
				
				const aluSnap = await getDocs(collection(db, 'aluminum'));
				const alus: InventoryDbItem[] = aluSnap.docs.map(docSnap => ({
					id: docSnap.id,
					...(docSnap.data() as any)
				}));
				setDbAluminum(alus);
				
				// --- BULLETPROOF AUTO-INCREMENT MATERIAL REQUEST NO LOGIC ---
				let nextMrNo = 'MR-2026-001';
				try {
					const reqSnapshot = await getDocs(collection(db, 'requests'));
					let maxNum = 0;
					
					reqSnapshot.docs.forEach((docSnap) => {
						const reqData = docSnap.data();
						const mrNumStr = String(reqData.materialRequestNo || '');
						const matches = mrNumStr.match(/(\d+)$/);
						if (matches) {
							const num = parseInt(matches[1], 10);
							if (num > maxNum) {
								maxNum = num;
							}
						}
					});
					
					if (maxNum > 0) {
						const nextNumFormatted = String(maxNum + 1).padStart(3, '0');
						const year = new Date().getFullYear();
						nextMrNo = `MR-${year}-${nextNumFormatted}`;
					}
				} catch (err) {
					console.error('Error auto-generating Material Request number:', err);
				}
				
				setMaterialRequestNo(nextMrNo);
				// --------------------------------------------------------
				
			} catch (err) {
				console.error('Error fetching database items:', err);
			}
		};
		
		fetchInitialData();
	}, []);
	
	const triggerError = (title: string, message: string) => {
		setErrorMessage({ title, message });
		openErrorModal();
	};
	
	const activeBatchType = itemsList.length > 0 ? itemsList[0].itemType : null;
	
	// Handle Accessory Autocomplete selection -> Auto-updates fields
	const handleAccessorySelect = (selectedValue: string) => {
		setSearchQuery(selectedValue);
		const matched = dbAccessories.find(
			item => `${item.name} (${item.code})` === selectedValue || item.name === selectedValue || item.code === selectedValue
		);
		if (matched) {
			if (matched.name) setSearchQuery(matched.name);
			if (matched.code) setAccCode(matched.code);
		}
	};
	
	// Handle Aluminum Autocomplete selection -> Auto-updates all aluminum fields
	const handleAluminumSelect = (selectedValue: string) => {
		setSearchQuery(selectedValue);
		const matched = dbAluminum.find(
			item => `${item.name} (${item.code})` === selectedValue || item.name === selectedValue || item.code === selectedValue
		);
		if (matched) {
			if (matched.name) {
				setSearchQuery(matched.name);
				setDescription(matched.name);
			}
			if (matched.code) setCode(matched.code);
			if (matched.finish) setRal(matched.finish);
			if (matched.length) setLength(matched.length);
			if (matched.weightPerMeter && matched.length) {
				setKg(Number((matched.weightPerMeter * matched.length).toFixed(2)));
			}
		}
	};
	
	const handleAddItem = () => {
		if (submitting) return;
		
		if (!projectName.trim()) {
			triggerError('Missing Project Name', 'Please enter a valid Project Name or Reference in Section 1 before adding items.');
			return;
		}
		
		if (!searchQuery.trim()) {
			triggerError('Missing Item Description', selectedType === 'Accessories' ? 'Please select or type an accessory item name.' : 'Please select or type an aluminum profile description.');
			return;
		}
		
		if (selectedType === 'Accessories' && !accCode.trim()) {
			triggerError('Accessory Code Missing', 'Please enter or auto-populate the accessory code (acc-code) before adding the item.');
			return;
		}
		
		if (selectedType === 'Aluminum' && !code.trim()) {
			triggerError('Profile Code Missing', 'Please enter or auto-populate the aluminum profile code.');
			return;
		}
		
		if (qty === '' || Number(qty) <= 0) {
			triggerError('Invalid Quantity Specified', 'The quantity must be a positive number greater than 0.');
			return;
		}
		
		if (selectedType === 'Aluminum' && (length === '' || Number(length) <= 0)) {
			triggerError('Invalid Length', 'Please provide a valid aluminum profile length in meters greater than 0.');
			return;
		}
		
		const parsedQty = typeof qty === 'number' ? qty : Number(qty);
		const parsedLength = typeof length === 'number' ? length : Number(length);
		const parsedKg = typeof kg === 'number' ? kg : kg === '' ? 0 : Number(kg);
		
		const newItem: RequestItem = {
			id: Math.random().toString(),
			itemType: selectedType,
			itemName: searchQuery,
			accCode: selectedType === 'Accessories' ? accCode : undefined,
			category: selectedType === 'Aluminum' ? aluCategory || 'Aluminium Extrusions - Profiles' : undefined,
			code: selectedType === 'Aluminum' ? code : undefined,
			description: selectedType === 'Aluminum' ? description : undefined,
			length: selectedType === 'Aluminum' ? parsedLength : undefined,
			kg: selectedType === 'Aluminum' ? parsedKg : undefined,
			qty: parsedQty,
			ral: selectedType === 'Aluminum' ? ral : undefined,
		};
		
		setItemsList([...itemsList, newItem]);
		
		// Reset Form Fields
		setSearchQuery('');
		setAccCode('');
		setCode('');
		setDescription('');
		setLength(6.0);
		setKg('');
		setQty(10);
		setRal('Mill Finish');
	};
	
	const handleRemoveItem = (id: string) => {
		if (submitting) return;
		setItemsList(itemsList.filter((i) => i.id !== id));
	};
	
	const handlePreSubmitCheck = () => {
		if (submitting) return;
		if (!projectName.trim()) {
			triggerError('Project Name Required', 'You cannot submit this requisition without specifying a Project Name in Section 1.');
			return;
		}
		if (materialRequestNo.trim() === '') {
			triggerError('Material Request Number Required', 'Please provide a valid Material Request number.');
			return;
		}
		if (itemsList.length === 0) {
			triggerError('Empty Requisition Batch', 'Please add at least one item to your table batch before trying to submit.');
			return;
		}
		openConfirm();
	};
	
	const handleFinalSubmit = async () => {
		if (submitting) return;
		setSubmitting(true);
		try {
			const storedUser = localStorage.getItem('ciji_user');
			const currentUser = storedUser ? JSON.parse(storedUser) : { username: 'storekeeper_default' };
			
			const requestPayload = {
				materialRequestNo,
				projectName,
				storekeeperUid: currentUser.username || currentUser.name || 'storekeeper_default',
				purchaserUid: null,
				status: 'Request',
				createdAt: serverTimestamp(),
				requestType: itemsList[0]?.itemType || 'Accessories',
				items: itemsList.map((item) => ({
					itemType: item.itemType,
					itemName: item.itemName,
					qty: item.qty,
					...(item.itemType === 'Accessories' && {
						accCode: item.accCode || '',
					}),
					...(item.itemType === 'Aluminum' && {
						category: item.category || '',
						code: item.code || '',
						description: item.description || '',
						length: item.length || 6.0,
						kg: item.kg || 0,
						ral: item.ral || 'Mill Finish',
					}),
				})),
			};
			
			await addDoc(collection(db, 'requests'), requestPayload);
			
			closeConfirm();
			router.push('/requests');
		} catch (error) {
			console.error('Error saving requisition:', error);
			triggerError('Database Connection Error', 'Failed to save request batch to Firestore. Please check your network connection and try again.');
			setSubmitting(false);
		}
	};
	
	return (
		<Container size="lg" p={0} style={{ width: '100%' }}>
			<Stack gap="lg">
				{/* Page Header */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" align="center">
						<Group gap="sm">
							<ActionIcon variant="subtle" color="gray" disabled={submitting} onClick={() => router.push('/requests')}>
								<IconArrowLeft size={18} />
							</ActionIcon>
							<div>
								<Title order={3}>New Material Requisition</Title>
								<Text size="xs" c="dimmed">
									Create store requests easily with automatic tracking and database search suggestions
								</Text>
							</div>
						</Group>
						<Button variant="default" disabled={submitting} onClick={() => router.push('/requests')}>
							Cancel
						</Button>
					</Group>
				</Paper>
				
				{/* SECTION 1: Project Details */}
				<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Stack gap="md">
						<Title order={5} c="myColor">
							Project & Request Details
						</Title>
						<Group grow>
							<TextInput
								label="Project Name / Reference"
								placeholder="e.g., Downtown Tower Glazing"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								disabled={submitting}
								required
							/>
							<TextInput
								label="Material Request Number"
								value={materialRequestNo}
								onChange={(e) => setMaterialRequestNo(e.target.value)}
								disabled={submitting}
								required
							/>
						</Group>
					</Stack>
				</Paper>
				
				{/* DYNAMIC FORM SWITCHER */}
				<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Stack gap="md">
						<Group justify="space-between" align="center">
							<div>
								<Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
									Select Item Type
								</Text>
								<Title order={5}>Requisition Form</Title>
							</div>
							
							<SegmentedControl
								value={selectedType}
								disabled={itemsList.length > 0 || submitting}
								onChange={(val: string) => {
									if (val === 'Accessories' || val === 'Aluminum') {
										setSelectedType(val);
										setSearchQuery('');
									}
								}}
								data={[
									{ label: 'Accessories Request', value: 'Accessories' },
									{ label: 'Aluminum Request', value: 'Aluminum' },
								]}
								color="myColor"
							/>
						</Group>
						
						{/* ALERT BANNER FOR LOCKED STATE */}
						{itemsList.length > 0 && (
							<Alert
								icon={<IconInfoCircle size={20} />}
								title="Item Type Locked"
								color="myColor"
								variant="light"
								radius="md"
							>
								<Text size="sm" fw={700}>
									Item type is locked to &quot;{activeBatchType}&quot; because items exist in this batch list. Delete all items from the table below to switch type.
								</Text>
							</Alert>
						)}
						
						<Divider my="xs" />
						
						{/* DYNAMIC FORM: ACCESSORIES */}
						{selectedType === 'Accessories' && (
							<Stack gap="md">
								<Autocomplete
									label="Database Auto-Suggest Search (Type Name or Code)"
									placeholder="Search accessory from database..."
									leftSection={<IconSearch size={16} />}
									data={dbAccessories.map(item => `${item.name} (${item.code})`)}
									value={searchQuery}
									onChange={setSearchQuery}
									onOptionSubmit={handleAccessorySelect}
									disabled={submitting}
								/>
								
								<Group grow>
									<TextInput
										label="Accessory Code (acc-code)"
										placeholder="e.g., ACC-ROL-01"
										value={accCode}
										onChange={(e) => setAccCode(e.target.value)}
										disabled={submitting}
									/>
									<NumberInput
										label="Quantity"
										min={1}
										value={qty}
										onChange={(val) => setQty(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
										disabled={submitting}
									/>
								</Group>
								
								<Group justify="flex-end">
									<Button onClick={handleAddItem} color="myColor" disabled={submitting} leftSection={<IconPlus size={16} />}>
										Add Accessory
									</Button>
								</Group>
							</Stack>
						)}
						
						{/* DYNAMIC FORM: ALUMINUM */}
						{selectedType === 'Aluminum' && (
							<Stack gap="md">
								<Autocomplete
									label="Database Auto-Suggest Search (Type Name or Code)"
									placeholder="Search aluminum profile from database..."
									leftSection={<IconSearch size={16} />}
									data={dbAluminum.map(item => `${item.name} (${item.code})`)}
									value={searchQuery}
									onChange={setSearchQuery}
									onOptionSubmit={handleAluminumSelect}
									disabled={submitting}
								/>
								
								<Group grow align="flex-end">
									<Select
										label="Category"
										data={[
											'Aluminium Extrusions - Profiles',
											'Mullions & Transoms',
											'Window & Door Sashes',
											'Angle & Channel Sections',
										]}
										value={aluCategory}
										onChange={setAluCategory}
										disabled={submitting}
									/>
									<TextInput
										label="Profile Code"
										placeholder="e.g., AL-102"
										value={code}
										onChange={(e) => setCode(e.target.value)}
										disabled={submitting}
									/>
								</Group>
								
								<Group grow>
									<TextInput
										label="Description"
										placeholder="e.g., Main Mullion Extrusion"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										disabled={submitting}
									/>
									<NumberInput
										label="Length (m)"
										decimalScale={2}
										value={length}
										onChange={(val) => setLength(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
										disabled={submitting}
									/>
								</Group>
								
								<Group grow align="flex-end">
									<NumberInput
										label="Weight (KG)"
										decimalScale={2}
										placeholder="e.g., 4.2"
										value={kg}
										onChange={(val) => setKg(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
										disabled={submitting}
									/>
									<NumberInput
										label="Quantity (Qty)"
										min={1}
										value={qty}
										onChange={(val) => setQty(typeof val === 'number' ? val : val === '' ? '' : Number(val))}
										disabled={submitting}
									/>
									<TextInput
										label="RAL Finish"
										placeholder="e.g., Mill Finish, RAL 9010"
										value={ral}
										onChange={(e) => setRal(e.target.value)}
										disabled={submitting}
									/>
								</Group>
								
								<Group justify="flex-end">
									<Button onClick={handleAddItem} color="myColor" disabled={submitting} leftSection={<IconPlus size={16} />}>
										Add Aluminum
									</Button>
								</Group>
							</Stack>
						)}
						
						{/* BATCH ITEMS TABLE */}
						{itemsList.length > 0 && (
							<Table withTableBorder mt="md">
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Type</Table.Th>
										<Table.Th>Item Description</Table.Th>
										<Table.Th>Details (Code / L / KG / RAL)</Table.Th>
										<Table.Th>Qty</Table.Th>
										<Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{itemsList.map((item) => (
										<Table.Tr key={item.id}>
											<Table.Td>
												<Badge size="xs" variant="light" color="myColor">
													{item.itemType}
												</Badge>
											</Table.Td>
											<Table.Td fw={500}>{item.itemName}</Table.Td>
											<Table.Td>
												<Text size="xs" c="dimmed">
													{item.itemType === 'Aluminum' ? (
														<>
															Profile Code: {item.code || '-'} | L: {item.length}m | KG: {item.kg || '-'}kg | RAL: {item.ral}
														</>
													) : (
														<>Accessory Code: {item.accCode || '-'}</>
													)}
												</Text>
											</Table.Td>
											<Table.Td fw={600}>{item.qty}</Table.Td>
											<Table.Td style={{ textAlign: 'right' }}>
												<ActionIcon color="red" variant="subtle" size="xs" disabled={submitting} onClick={() => handleRemoveItem(item.id)}>
													<IconTrash size={14} />
												</ActionIcon>
											</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						)}
					</Stack>
				</Paper>
				
				{/* Action Bar */}
				<Group justify="flex-end" mb="xl">
					<Button variant="default" disabled={submitting} onClick={() => router.push('/requests')}>
						Cancel
					</Button>
					<Button
						color="myColor"
						disabled={submitting}
						leftSection={<IconCheck size={16} />}
						onClick={handlePreSubmitCheck}
					>
						Review & Submit Request
					</Button>
				</Group>
				
				{/* ERROR POPUP WINDOW */}
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
							<Text size="sm" c="red.9" fw={500}>
								{errorMessage.message}
							</Text>
						</Paper>
						<Group justify="flex-end" mt="xs">
							<Button color="red" variant="light" onClick={closeErrorModal}>
								OK, Got It
							</Button>
						</Group>
					</Stack>
				</Modal>
				
				{/* CONFIRMATION POPUP WINDOW */}
				<Modal opened={confirmOpened} onClose={closeConfirm} title="Confirm Requisition Submission" radius="md" centered>
					<Stack gap="md">
						<Group gap="sm">
							<IconPackage size={28} style={{ color: 'var(--mantine-color-myColor-9)' }} />
							<div>
								<Text fw={600}>Submit request for project &quot;{projectName}&quot;?</Text>
								<Text size="xs" c="dimmed">
									This batch contains {itemsList.length} item(s) and will record your storekeeper profile for order tracking.
								</Text>
							</div>
						</Group>
						
						<Group justify="flex-end" mt="md">
							<Button variant="default" disabled={submitting} onClick={closeConfirm}>
								Back
							</Button>
							<Button
								color="myColor"
								loading={submitting}
								loaderProps={{ type: 'dots' }}
								onClick={handleFinalSubmit}
							>
								{submitting ? 'Saving to Database...' : 'Confirm & Submit'}
							</Button>
						</Group>
					</Stack>
				</Modal>
			</Stack>
		</Container>
	);
}