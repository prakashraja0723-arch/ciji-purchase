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
} from '@mantine/core';
import {
	IconSearch,
	IconFileDescription,
	IconEye,
	IconEdit,
	IconPrinter,
	IconRefresh,
	IconPlus,
} from '@tabler/icons-react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
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
	lpoNo?: string;
	items: RequestItem[];
	createdAt?: Timestamp;
}

interface FirestoreLPO {
	id: string;
	lpoNo: string;
	revisionNo?: string;
	materialRequestNo: string;
	projectName: string;
	requestType: string;
	storekeeperUid: string;
	purchaserUid?: string;
	items: RequestItem[];
	createdAt?: Timestamp;
}

export default function LpoManagementPage() {
	const router = useRouter();
	const [requests, setRequests] = useState<FirestoreRequest[]>([]);
	const [lpos, setLpos] = useState<FirestoreLPO[]>([]);
	const [loading, setLoading] = useState(true);
	
	// Role check simulation (Admin / Procurement)
	const [userRole] = useState<string>(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('userRole') || 'admin';
		}
		return 'admin';
	});
	const canCreateLpo = userRole === 'admin' || userRole === 'procurement';
	
	// Filters & Search
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string | null>('All');
	
	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const reqQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
			const reqSnapshot = await getDocs(reqQuery);
			const loadedReqs: FirestoreRequest[] = reqSnapshot.docs.map((docSnap) => ({
				id: docSnap.id,
				...(docSnap.data() as Omit<FirestoreRequest, 'id'>),
			}));
			
			const activeReqs = loadedReqs.filter((req) => req.status !== 'Ordered' && req.status !== 'Completed');
			setRequests(activeReqs);
			
			const lpoQuery = query(collection(db, 'lpos'), orderBy('createdAt', 'desc'));
			const lpoSnapshot = await getDocs(lpoQuery);
			const loadedLpos: FirestoreLPO[] = lpoSnapshot.docs.map((docSnap) => ({
				id: docSnap.id,
				...(docSnap.data() as Omit<FirestoreLPO, 'id'>),
			}));
			setLpos(loadedLpos);
		} catch (error) {
			console.error('Error fetching data for LPO page:', error);
		} finally {
			setLoading(false);
		}
	}, []);
	
	useEffect(() => {
		fetchData().catch((err) => console.error('Failed to load data:', err));
	}, [fetchData]);
	
	const filteredRequests = requests.filter((req) => {
		const matchesSearch =
			req.materialRequestNo.toLowerCase().includes(search.toLowerCase()) ||
			req.projectName.toLowerCase().includes(search.toLowerCase());
		
		const matchesStatus = statusFilter === 'All' || !statusFilter || req.status === statusFilter;
		
		return matchesSearch && matchesStatus;
	});
	
	return (
		<Container size="lg" p={0} style={{ width: '100%' }}>
			<Stack gap="xl">
				{/* Page Header */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" align="center">
						<div>
							<Title order={3}>LPO & Procurement Management</Title>
							<Text size="xs" c="dimmed">
								Generate Local Purchase Orders (LPOs), handle partial ordering, and view issued LPOs
							</Text>
						</div>
						
						<Group gap="sm">
							<ActionIcon
								variant="default"
								size="lg"
								onClick={() => {
									fetchData().catch((err) => console.error('Failed to refresh data:', err));
								}}
								title="Refresh Data"
							>
								<IconRefresh size={18} />
							</ActionIcon>
							
							{/* Role-Gated Create Direct LPO Button */}
							{canCreateLpo && (
								<Button
									color="myColor"
									leftSection={<IconPlus size={16} />}
									onClick={() => router.push('/lpo/create')}
								>
									Create Direct LPO
								</Button>
							)}
						</Group>
					</Group>
				</Paper>
				
				{/* Filters & Search Bar */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group grow align="flex-end">
						<TextInput
							label="Search Requisitions"
							placeholder="Search by MR No, Project..."
							leftSection={<IconSearch size={16} />}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Select
							label="Status Filter"
							data={['All', 'Request', 'Partially Ordered']}
							value={statusFilter}
							onChange={setStatusFilter}
						/>
					</Group>
				</Paper>
				
				{/* SECTION 1: Active Requisitions List */}
				{(!loading && filteredRequests.length > 0) || loading ? (
					<Stack gap="sm">
						<Title order={4}>Active Requisitions (Ready for LPO)</Title>
						<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
							{loading ? (
								<Center p="xl">
									<Loader color="myColor" size="md" />
								</Center>
							) : (
								<Table withTableBorder>
									<Table.Thead>
										<Table.Tr>
											<Table.Th>MR Number</Table.Th>
											<Table.Th>Project Name</Table.Th>
											<Table.Th>Type</Table.Th>
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
													<Button
														size="xs"
														variant="light"
														color="myColor"
														leftSection={<IconFileDescription size={14} />}
														onClick={() => router.push(`/lpo/create?id=${req.id}`)}
													>
														Issue LPO
													</Button>
												</Table.Td>
											</Table.Tr>
										))}
									</Table.Tbody>
								</Table>
							)}
						</Paper>
					</Stack>
				) : null}
				
				{/* SECTION 2: Issued LPOs List */}
				<Stack gap="sm">
					<Title order={4}>Issued LPOs List</Title>
					<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
						{lpos.length === 0 ? (
							<Center p="xl">
								<Text size="xs" c="dimmed">No LPOs have been issued yet.</Text>
							</Center>
						) : (
							<Table withTableBorder>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Project</Table.Th>
										<Table.Th>LPO No</Table.Th>
										<Table.Th>Type</Table.Th>
										<Table.Th>Ordered By</Table.Th>
										<Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{lpos.map((lpo) => (
										<Table.Tr key={lpo.id}>
											<Table.Td fw={500}>{lpo.projectName}</Table.Td>
											<Table.Td fw={700} c="blue.6">
												{lpo.lpoNo} {lpo.revisionNo && <Badge size="xs" ml={6} color="orange">{lpo.revisionNo}</Badge>}
											</Table.Td>
											<Table.Td>
												<Badge size="sm" variant="light" color={lpo.requestType === 'Aluminum' ? 'blue' : 'myColor'}>
													{lpo.requestType}
												</Badge>
											</Table.Td>
											<Table.Td><Text size="xs" c="dimmed">{lpo.storekeeperUid || 'Procurement Team'}</Text></Table.Td>
											<Table.Td style={{ textAlign: 'right' }}>
												<Group gap="xs" justify="flex-end">
													<ActionIcon
														variant="subtle"
														color="gray"
														onClick={() => router.push(`/lpo/view?id=${lpo.id}`)}
														title="View LPO"
													>
														<IconEye size={16} />
													</ActionIcon>
													{/* Updated Revise action routing to the new dedicated revision page */}
													<ActionIcon
														variant="subtle"
														color="myColor"
														onClick={() => router.push(`/lpo/revise?lpoId=${lpo.id}`)}
														title="Revise LPO"
													>
														<IconEdit size={16} />
													</ActionIcon>
													<ActionIcon
														variant="subtle"
														color="blue"
														onClick={() => router.push(`/lpo/print?id=${lpo.id}`)}
														title="Print A4 LPO"
													>
														<IconPrinter size={16} />
													</ActionIcon>
												</Group>
											</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						)}
					</Paper>
				</Stack>
			</Stack>
		</Container>
	);
}