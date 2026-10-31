'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
	NumberInput,
	ActionIcon,
	Modal,
	Loader,
	Center,
	Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
	IconSearch,
	IconPlus,
	IconEdit,
	IconTrash,
	IconRefresh,
	IconPackage,
	IconAlertTriangle,
	IconFileSpreadsheet,
	IconUpload,
	IconX,
} from '@tabler/icons-react';
import {
	collection,
	getDocs,
	doc,
	setDoc,
	deleteDoc,
	query,
	orderBy,
	serverTimestamp,
	Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';

interface InventoryItem {
	id: string;
	category: string;
	code: string;
	name: string;
	stock: number;
	minStock: number;
	unit: string;
	createdAt?: Timestamp;
}

interface FormValues {
	name: string;
	code: string;
	category: string;
	stock: number;
	minStock: number;
	unit: string;
}

export default function InventoryManagementPage() {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);

	// Filters & Search
	const [search, setSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string | null>('All');

	// Modals State
	const [opened, { open: openItemModal, close: closeItemModal }] = useDisclosure(false);
	const [bulkOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);

	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [bulkSubmitting, setBulkSubmitting] = useState(false);

	// Mantine useForm Hook setup matching your inventory schema
	const form = useForm<FormValues>({
		initialValues: {
			name: '',
			code: '',
			category: 'Accessories',
			stock: 0,
			minStock: 10,
			unit: 'PCS',
		},
		validate: {
			name: (value) => (value.trim().length < 2 ? 'Item name is required' : null),
			code: (value) => (value.trim().length < 2 ? 'Item code is required' : null),
			category: (value) => (!value ? 'Category is required' : null),
			stock: (value) => (value < 0 ? 'Stock cannot be negative' : null),
			minStock: (value) => (value < 0 ? 'Minimum stock cannot be negative' : null),
			unit: (value) => (!value.trim() ? 'Unit is required' : null),
		},
	});

	// Fetch Inventory Items from Firestore
	const fetchInventory = useCallback(async () => {
		setLoading(true);
		try {
			const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
			const querySnapshot = await getDocs(q);
			const loadedItems: InventoryItem[] = querySnapshot.docs.map((docSnap) => ({
				id: docSnap.id,
				...(docSnap.data() as Omit<InventoryItem, 'id'>),
			}));
			setItems(loadedItems);
		} catch (error) {
			console.error('Error fetching inventory:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchInventory().catch((err) => console.error('Failed to load inventory:', err));
	}, [fetchInventory]);

	// Open modal for creation
	const handleOpenCreate = () => {
		setEditingItemId(null);
		form.setValues({
			name: '',
			code: `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
			category: 'Accessories',
			stock: 0,
			minStock: 10,
			unit: 'PCS',
		});
		form.clearErrors();
		openItemModal();
	};

	// Open modal for editing
	const handleOpenEdit = (item: InventoryItem) => {
		setEditingItemId(item.id);
		form.setValues({
			name: item.name || '',
			code: item.code || '',
			category: item.category || 'Accessories',
			stock: item.stock || 0,
			minStock: item.minStock || 10,
			unit: item.unit || 'PCS',
		});
		form.clearErrors();
		openItemModal();
	};

	// Save or Update Inventory Item via useForm Submit Handler
	const handleSaveItem = async (values: FormValues) => {
		try {
			setSubmitting(true);

			const itemRef = editingItemId
				? doc(db, 'inventory', editingItemId)
				: doc(collection(db, 'inventory'));

			const itemData: any = {
				name: values.name.trim().toUpperCase(),
				code: values.code.trim().toUpperCase(),
				category: values.category,
				stock: Number(values.stock),
				minStock: Number(values.minStock),
				unit: values.unit.trim().toUpperCase(),
				updatedAt: serverTimestamp(),
			};

			if (!editingItemId) {
				itemData.createdAt = serverTimestamp();
			}

			await setDoc(itemRef, itemData, { merge: true });
			closeItemModal();
			await fetchInventory();
		} catch (error) {
			console.error('Error saving inventory item:', error);
		} finally {
			setSubmitting(false);
		}
	};

	// Handle Bulk Excel Upload for Inventory
	const handleFileUpload = async (files: File[]) => {
		if (files.length === 0) return;
		const file = files[0];

		try {
			setBulkSubmitting(true);
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data);
			const worksheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[worksheetName];
			const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

			if (jsonData.length === 0) {
				alert('The uploaded Excel file is empty.');
				return;
			}

			for (const row of jsonData) {
				const name = String(row.name || row.Name || '').trim().toUpperCase();
				const code = String(row.code || row.Code || '').trim().toUpperCase();
				const category = String(row.category || row.Category || 'Accessories').trim();
				const stock = Number(row.stock || row.Stock || 0);
				const minStock = Number(row.minStock || row['Min Stock'] || 10);
				const unit = String(row.unit || row.Unit || 'PCS').trim().toUpperCase();

				if (!name || !code) continue;

				const itemId = code.toLowerCase().replace(/[^a-z0-9]/g, '_');
				const itemRef = doc(db, 'inventory', itemId);

				await setDoc(itemRef, {
					name,
					code,
					category,
					stock,
					minStock,
					unit,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				}, { merge: true });
			}

			closeBulkModal();
			await fetchInventory();
			alert('Inventory items successfully imported from Excel!');
		} catch (error) {
			console.error('Error processing Excel file:', error);
			alert('Failed to parse Excel file. Please check column formats.');
		} finally {
			setBulkSubmitting(false);
		}
	};

	// Delete Inventory Item
	const handleDeleteItem = async (id: string) => {
		if (!confirm('Are you sure you want to delete this inventory item?')) return;
		try {
			await deleteDoc(doc(db, 'inventory', id));
			setItems(items.filter((item) => item.id !== id));
		} catch (error) {
			console.error('Error deleting inventory item:', error);
		}
	};

	// Filter Logic
	const filteredItems = items.filter((item) => {
		const matchesSearch =
			(item.name || '').toLowerCase().includes(search.toLowerCase()) ||
			(item.code || '').toLowerCase().includes(search.toLowerCase());

		const matchesCategory =
			categoryFilter === 'All' ||
			!categoryFilter ||
			(item.category || '').toLowerCase() === categoryFilter.toLowerCase();

		return matchesSearch && matchesCategory;
	});

	return (
		<Container size="lg" p={0} style={{ width: '100%' }}>
			<Stack gap="xl">

				{/* Page Header */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" align="center">
						<div>
							<Title order={3}>Store Inventory Management</Title>
							<Text size="xs" c="dimmed">
								Track warehouse stock levels, hardware components, sealants, and minimum stock alerts
							</Text>
						</div>
						<Group gap="xs">
							<ActionIcon
								variant="default"
								size="lg"
								onClick={() => {
									fetchInventory().catch((err) => console.error('Failed to refresh inventory:', err));
								}}
								title="Refresh Inventory"
							>
								<IconRefresh size={18} />
							</ActionIcon>
							<Button
								variant="light"
								color="myColor"
								leftSection={<IconFileSpreadsheet size={16} />}
								onClick={openBulkModal}
							>
								Bulk Upload
							</Button>
							<Button
								leftSection={<IconPlus size={16} />}
								color="myColor"
								onClick={handleOpenCreate}
							>
								Add Inventory Item
							</Button>
						</Group>
					</Group>
				</Paper>

				{/* Filters & Search Bar */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group grow align="flex-end">
						<TextInput
							label="Search Inventory"
							placeholder="Search by item name or code..."
							leftSection={<IconSearch size={16} />}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Select
							label="Category Filter"
							data={['All', 'Accessories', 'Aluminum', 'Glass', 'Consumables']}
							value={categoryFilter}
							onChange={setCategoryFilter}
						/>
					</Group>
				</Paper>

				{/* Inventory List Table */}
				<Stack gap="sm">
					<Title order={4}>Warehouse Stock Items</Title>
					<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
						{loading ? (
							<Center p="xl">
								<Loader color="myColor" size="md" />
							</Center>
						) : filteredItems.length === 0 ? (
							<Center p="xl">
								<Text size="xs" c="dimmed">No inventory items found matching your search.</Text>
							</Center>
						) : (
							<Table withTableBorder>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Code</Table.Th>
										<Table.Th>Item Name</Table.Th>
										<Table.Th>Category</Table.Th>
										<Table.Th>Stock Level</Table.Th>
										<Table.Th>Status</Table.Th>
										<Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{filteredItems.map((item) => {
										const isLowStock = item.stock <= item.minStock;
										return (
											<Table.Tr key={item.id}>
												<Table.Td fw={700} c="myColor.6">{item.code}</Table.Td>
												<Table.Td fw={600}>{item.name}</Table.Td>
												<Table.Td>
													<Badge size="sm" variant="outline" color="gray">
														{item.category}
													</Badge>
												</Table.Td>
												<Table.Td fw={700}>
													{item.stock} <Text span size="xs" c="dimmed" fw={400}>{item.unit}</Text>
												</Table.Td>
												<Table.Td>
													{isLowStock ? (
														<Badge size="xs" variant="light" color="red" leftSection={<IconAlertTriangle size={12} />}>
															Low Stock (Min: {item.minStock})
														</Badge>
													) : (
														<Badge size="xs" variant="light" color="green">
															Optimal
														</Badge>
													)}
												</Table.Td>
												<Table.Td style={{ textAlign: 'right' }}>
													<Group gap="xs" justify="flex-end">
														<ActionIcon
															variant="subtle"
															color="myColor"
															onClick={() => handleOpenEdit(item)}
															title="Edit Item"
														>
															<IconEdit size={16} />
														</ActionIcon>
														<ActionIcon
															variant="subtle"
															color="red"
															onClick={() => handleDeleteItem(item.id)}
															title="Delete Item"
														>
															<IconTrash size={16} />
														</ActionIcon>
													</Group>
												</Table.Td>
											</Table.Tr>
										);
									})}
								</Table.Tbody>
							</Table>
						)}
					</Paper>
				</Stack>
			</Stack>

			{/* Create / Edit Inventory Modal */}
			<Modal
				opened={opened}
				onClose={closeItemModal}
				title={
					<Group gap="xs">
						<IconPackage size={20} color="var(--mantine-color-myColor-6)" />
						<Text fw={700}>{editingItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}</Text>
					</Group>
				}
				centered
				radius="md"
			>
				<form onSubmit={form.onSubmit(handleSaveItem)}>
					<Stack gap="md">
						<TextInput
							label="Item Name"
							placeholder="e.g. MASTER CREMONE HANDLE"
							{...form.getInputProps('name')}
							required
						/>

						<Group grow align="flex-start">
							<TextInput
								label="Item Code"
								placeholder="e.g. ACC-1082"
								{...form.getInputProps('code')}
								required
							/>
							<Select
								label="Category"
								data={['Accessories', 'Aluminum', 'Glass', 'Consumables']}
								{...form.getInputProps('category')}
								required
							/>
						</Group>

						<Group grow align="flex-start">
							<NumberInput
								label="Current Stock"
								placeholder="9"
								{...form.getInputProps('stock')}
								required
								min={0}
							/>
							<NumberInput
								label="Minimum Stock Alert"
								placeholder="10"
								{...form.getInputProps('minStock')}
								required
								min={0}
							/>
						</Group>

						<TextInput
							label="Unit of Measurement"
							placeholder="e.g. PCS, MTR, KG"
							{...form.getInputProps('unit')}
							required
						/>

						<Group justify="flex-end" mt="md">
							<Button variant="default" onClick={closeItemModal}>Cancel</Button>
							<Button type="submit" color="myColor" loading={submitting}>
								{editingItemId ? 'Update Item' : 'Save Item'}
							</Button>
						</Group>
					</Stack>
				</form>
			</Modal>

			{/* Bulk Excel Upload Modal */}
			<Modal
				opened={bulkOpened}
				onClose={closeBulkModal}
				title={
					<Group gap="xs">
						<IconFileSpreadsheet size={20} color="var(--mantine-color-myColor-6)" />
						<Text fw={700}>Bulk Upload Inventory via Excel</Text>
					</Group>
				}
				centered
				size="lg"
				radius="md"
			>
				<Stack gap="md">
					<Group justify="space-between" align="center">
						<Text size="xs" c="dimmed" style={{ flex: 1 }}>
							Upload an Excel (.xlsx, .xls) or CSV file containing your inventory items using these exact columns:
						</Text>
						<Button
							variant="subtle"
							size="xs"
							color="myColor"
							leftSection={<IconFileSpreadsheet size={14} />}
							onClick={() => {
								const templateData = [{
									name: 'MASTER CREMONE HANDLE',
									code: 'ACC-1082',
									category: 'Accessories',
									stock: 9,
									minStock: 10,
									unit: 'PCS'
								}];
								const ws = XLSX.utils.json_to_sheet(templateData);
								const wb = XLSX.utils.book_new();
								XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
								XLSX.writeFile(wb, "inventory_template.xlsx");
							}}
						>
							Download Template
						</Button>
					</Group>

					<Paper p="xs" withBorder bg="gray.0">
						<Code block color="gray" p="xs">
							name | code | category | stock | minStock | unit
						</Code>
					</Paper>

					{bulkSubmitting ? (
						<Center p="xl">
							<Stack align="center" gap="xs">
								<Loader color="myColor" size="lg" />
								<Text size="xs" c="dimmed">Importing inventory into database...</Text>
							</Stack>
						</Center>
					) : (
						<Dropzone
							onDrop={handleFileUpload}
							accept={[MIME_TYPES.xlsx, MIME_TYPES.xls, MIME_TYPES.csv]}
							maxFiles={1}
						>
							<Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
								<Dropzone.Accept>
									<IconUpload size={50} color="var(--mantine-color-myColor-6)" />
								</Dropzone.Accept>
								<Dropzone.Reject>
									<IconX size={50} color="red" />
								</Dropzone.Reject>
								<Dropzone.Idle>
									<IconFileSpreadsheet size={50} color="gray" />
								</Dropzone.Idle>

								<div>
									<Text size="sm" inline fw={600}>
										Drag Excel file here or click to select file
									</Text>
									<Text size="xs" c="dimmed" inline mt={7}>
										Supports .xlsx, .xls and .csv file formats
									</Text>
								</div>
							</Group>
						</Dropzone>
					)}

					<Group justify="flex-end" mt="md">
						<Button variant="default" onClick={closeBulkModal} disabled={bulkSubmitting}>
							Cancel
						</Button>
					</Group>
				</Stack>
			</Modal>
		</Container>
	);
}