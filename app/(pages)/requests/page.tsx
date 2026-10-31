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
	ThemeIcon,
	Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
	IconPlus,
	IconSearch,
	IconEye,
	IconEdit,
	IconTrash,
	IconRefresh,
	IconBox,
	IconAlertTriangle,
} from '@tabler/icons-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface RequestItem {
	itemType: 'Accessories' | 'Aluminum';
	itemName: string;
	qty: number;
	accCode?: string;
	code?: string;
	description?: string;
	length?: number;
	kg?: number;
	ral?: string;
	orderedQty?: number;
	itemStatus?: string;
}

interface FirestoreRequest {
	id: string;
	materialRequestNo: string;
	projectName: string;
	storekeeperUid: string;
	purchaserUid: string | null;
	status: 'Request' | 'Ordered' | 'Partially Ordered' | 'Completed';
	requestType: 'Accessories' | 'Aluminum';
	items: RequestItem[];
	createdAt?: Timestamp;
}

export default function RequestsPage() {
	const router = useRouter();
	const [requests, setRequests] = useState<FirestoreRequest[]>([]);
	const [loading, setLoading] = useState(true);
	
	// Filters & Search
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState<string | null>('All');
	const [statusFilter, setStatusFilter] = useState<string | null>('All');
	
	// Delete Confirmation Modal State
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; mrNo: string } | null>(null);
	const [deleteOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
	const [deleting, setDeleting] = useState(false);
	
	const fetchRequests = useCallback(async () => {
		setLoading(true);
		try {
			const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
			const querySnapshot = await getDocs(q);
			
			const activeRequests: FirestoreRequest[] = [];
			
			for (const docSnap of querySnapshot.docs) {
				const data = docSnap.data() as Omit<FirestoreRequest, 'id'>;
				
				// Auto-delete leftover 'Ordered' documents from old test runs
				if (data.status === 'Ordered') {
					await deleteDoc(doc(db, 'requests', docSnap.id));
				} else {
					activeRequests.push({ id: docSnap.id, ...data });
				}
			}
			
			setRequests(activeRequests);
		} catch (error) {
			console.error('Error fetching requests:', error);
		} finally {
			setLoading(false);
		}
	}, []);
	
	useEffect(() => {
		fetchRequests().catch((err) => console.error('Failed to fetch requests:', err));
	}, [fetchRequests]);
	
	const handlePromptDelete = (id: string, mrNo: string) => {
		setDeleteTarget({ id, mrNo });
		openDeleteModal();
	};
	
	const handleConfirmDelete = async () => {
		if (!deleteTarget || deleting) return;
		setDeleting(true);
		try {
			await deleteDoc(doc(db, 'requests', deleteTarget.id));
			closeDeleteModal();
			setDeleteTarget(null);
			await fetchRequests();
		} catch (error) {
			console.error('Error deleting requisition:', error);
		} finally {
			setDeleting(false);
		}
	};
	
	const filteredRequests = requests.filter((req) => {
		const matchesSearch =
			req.materialRequestNo.toLowerCase().includes(search.toLowerCase()) ||
			req.projectName.toLowerCase().includes(search.toLowerCase()) ||
			req.storekeeperUid.toLowerCase().includes(search.toLowerCase());
		
		const matchesType = typeFilter === 'All' || !typeFilter || req.requestType === typeFilter;
		const matchesStatus = statusFilter === 'All' || !statusFilter || req.status === statusFilter;
		
		return matchesSearch && matchesType && matchesStatus;
	});
	
	return (
		<Container size="lg" p={0} style={{ width: '100%' }}>
			<Stack gap="lg">
				{/* Page Header */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" align="center">
						<div>
							<Title order={3}>Material Requisitions</Title>
							<Text size="xs" c="dimmed">
								Overview of site requests created by storekeepers for procurement
							</Text>
						</div>
						<Group gap="sm">
							<ActionIcon
								variant="default"
								size="lg"
								onClick={() => {
									fetchRequests().catch((err) => console.error('Failed to refresh requests:', err));
								}}
								title="Refresh Data"
							>
								<IconRefresh size={18} />
							</ActionIcon>
							<Button
								color="myColor"
								leftSection={<IconPlus size={16} />}
								onClick={() => router.push('/requests/new-request')}
							>
								New Request
							</Button>
						</Group>
					</Group>
				</Paper>
				
				{/* Filters & Search Bar */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group grow align="flex-end">
						<TextInput
							label="Search Requests"
							placeholder="Search by MR No, Project, Storekeeper..."
							leftSection={<IconSearch size={16} />}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Select
							label="Item Type"
							data={['All', 'Accessories', 'Aluminum']}
							value={typeFilter}
							onChange={setTypeFilter}
						/>
						<Select
							label="Status"
							data={['All', 'Request', 'Partially Ordered']}
							value={statusFilter}
							onChange={setStatusFilter}
						/>
					</Group>
				</Paper>
				
				{/* Firestore Requisitions Table */}
				<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					{loading ? (
						<Center p="xl">
							<Loader color="myColor" size="md" />
						</Center>
					) : filteredRequests.length === 0 ? (
						<Center p="xl">
							<Stack align="center" gap="xs">
								<ThemeIcon color="gray" variant="light" size="xl" radius="xl">
									<IconBox size={24} />
								</ThemeIcon>
								<Text fw={600} size="sm">No Requisitions Found</Text>
								<Text size="xs" c="dimmed">All requested items have been fully ordered or filtered out.</Text>
							</Stack>
						</Center>
					) : (
						<Table withTableBorder>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>MR Number</Table.Th>
									<Table.Th>Project Name</Table.Th>
									<Table.Th>Type</Table.Th>
									<Table.Th>Requested By</Table.Th>
									<Table.Th>Status</Table.Th>
									<Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{filteredRequests.map((req) => (
									<Table.Tr key={req.id}>
										<Table.Td fw={700}>{req.materialRequestNo}</Table.Td>
										<Table.Td fw={500}>{req.projectName}</Table.Td>
										<Table.Td>
											<Badge size="sm" variant="light" color={req.requestType === 'Aluminum' ? 'blue' : 'myColor'}>
												{req.requestType}
											</Badge>
										</Table.Td>
										<Table.Td><Text size="xs" c="dimmed">{req.storekeeperUid}</Text></Table.Td>
										<Table.Td>
											<Badge
												size="sm"
												variant="filled"
												color={req.status === 'Request' ? 'gray' : 'orange'}
											>
												{req.status}
											</Badge>
										</Table.Td>
										<Table.Td style={{ textAlign: 'right' }}>
											<Group gap="xs" justify="flex-end">
												<ActionIcon
													variant="subtle"
													color="gray"
													onClick={() => router.push(`/requests/view?id=${req.id}`)}
													title="View Details"
												>
													<IconEye size={16} />
												</ActionIcon>
												<ActionIcon
													variant="subtle"
													color="myColor"
													onClick={() => router.push(`/requests/edit?id=${req.id}`)}
													title="Edit Request"
												>
													<IconEdit size={16} />
												</ActionIcon>
												<ActionIcon
													variant="subtle"
													color="red"
													onClick={() => handlePromptDelete(req.id, req.materialRequestNo)}
													title="Delete Request"
												>
													<IconTrash size={16} />
												</ActionIcon>
											</Group>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					)}
				</Paper>
				
				{/* DELETE CONFIRMATION MODAL */}
				<Modal
					opened={deleteOpened}
					onClose={closeDeleteModal}
					title={
						<Group gap="sm">
							<ThemeIcon color="red" variant="light" size="lg" radius="xl">
								<IconAlertTriangle size={20} />
							</ThemeIcon>
							<Text fw={700} size="md">Confirm Deletion</Text>
						</Group>
					}
					size="sm"
					radius="md"
					centered
				>
					<Stack gap="md" pt="xs">
						<Text size="sm">
							Are you sure you want to delete requisition <span style={{ fontWeight: 700 }}>{deleteTarget?.mrNo}</span>? This action cannot be undone.
						</Text>
						
						<Group justify="flex-end" mt="md">
							<Button variant="default" disabled={deleting} onClick={closeDeleteModal}>
								Cancel
							</Button>
							<Button color="red" loading={deleting} onClick={() => { handleConfirmDelete().catch((err) => console.error('Deletion failed:', err)); }}>
								{deleting ? 'Deleting...' : 'Delete Requisition'}
							</Button>
						</Group>
					</Stack>
				</Modal>
			</Stack>
		</Container>
	);
}