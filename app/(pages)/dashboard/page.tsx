'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
	Box,
	Title,
	Text,
	Container,
	Paper,
	Stack,
	Grid,
	Group,
	Badge,
	Table,
	ThemeIcon,
	Button,
	Card,
	Progress,
	Loader,
	Center,
	Avatar,
} from '@mantine/core';
import {
	IconFileText,
	IconReceipt2,
	IconArrowUpRight,
	IconPlus,
	IconClock,
	IconCategory,
	IconAlertTriangle,
	IconActivity,
	IconAlertCircle,
	IconShieldCheck,
} from '@tabler/icons-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {json} from "node:stream/consumers";

interface UserSession {
	name?: string;
	username?: string;
	role?: string;
	department?: string;
}

interface RequestItem {
	itemName?: string;
	category?: string;
	itemType?: string;
	qty?: number;
	price?: number;
}

interface DashboardRequest {
	id: string;
	materialRequestNo?: string;
	projectName?: string;
	requestType?: string;
	status?: string;
	items?: RequestItem[];
}

interface InventoryCategory {
	label: string;
	percentage: number;
	color: string;
	stock: string;
}

interface FormattedRequest {
	id: string;
	item: string;
	section: string;
	qty: string;
	status: string;
}

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<UserSession | null>(null);
	
	const [loading, setLoading] = useState(true);
	const [totalRequestsCount, setTotalRequestsCount] = useState(0);
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
	const [totalLposCount, setTotalLposCount] = useState(0);
	const [totalLpoValue, setTotalLpoValue] = useState(0);
	const [outOfStockCount, setOutOfStockCount] = useState(0);
	const [minStockCount, setMinStockCount] = useState(0);
	const [recentRequests, setRecentRequests] = useState<FormattedRequest[]>([]);
	const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
	
	useEffect(() => {
		const storedUser = localStorage.getItem('ciji_user');
		if (!storedUser) {
			router.push('/login');
		} else {
			try {
				setUser(JSON.parse(storedUser));
			} catch (err) {
				console.error('Failed to parse user session:', err);
			}
		}
	}, [router]);
	
	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true);
			
			// 1. Requisitions
			const reqQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
			const reqSnapshot = await getDocs(reqQuery);
			const reqs: DashboardRequest[] = reqSnapshot.docs.map((docSnap) => ({
				id: docSnap.id,
				...docSnap.data(),
			}));
			
			setTotalRequestsCount(reqs.length);
			const pending = reqs.filter((r) => r.status === 'Request' || r.status === 'Partially Ordered');
			setPendingRequestsCount(pending.length);
			
			const formattedRecent: FormattedRequest[] = reqs.slice(0, 5).map((req) => ({
				id: req.materialRequestNo || req.id,
				item: req.items?.[0]?.itemName || req.requestType || 'Accessory Item',
				section: req.projectName || 'General Project',
				qty: `${req.items?.reduce((acc, item) => acc + (item.qty || 0), 0) || 0} units`,
				status: req.status || 'Request',
			}));
			setRecentRequests(formattedRecent);
			
			// 2. Inventory Distribution & Stock Alerts
			const categoryCounts: { [key: string]: number } = {};
			let totalItemsCount = 0;
			
			reqs.forEach((req) => {
				req.items?.forEach((item) => {
					const cat = item.category || item.itemType || 'General Hardware';
					categoryCounts[cat] = (categoryCounts[cat] || 0) + (item.qty || 1);
					totalItemsCount += item.qty || 1;
				});
			});
			
			const colorList = ['myColor', 'blue', 'teal', 'violet', 'orange', 'cyan'];
			const dynamicCategories: InventoryCategory[] =
				Object.keys(categoryCounts).length > 0
					? Object.entries(categoryCounts).map(([label, count], index) => ({
						label,
						percentage: totalItemsCount > 0 ? Math.round((count / totalItemsCount) * 100) : 0,
						color: colorList[index % colorList.length],
						stock: `${count} units`,
					}))
					: [{ label: 'No Active Inventory Data', percentage: 0, color: 'gray', stock: '0 units' }];
			
			setInventoryCategories(dynamicCategories);
			
			try {
				const invSnap = await getDocs(collection(db, 'inventory'));
				if (!invSnap.empty) {
					let outCount = 0;
					let minCount = 0;
					invSnap.docs.forEach((d) => {
						const data = d.data();
						const q = Number(data.qty) || 0;
						const min = Number(data.minStock) || 5;
						if (q === 0) outCount++;
						else if (q <= min) minCount++;
					});
					setOutOfStockCount(outCount);
					setMinStockCount(minCount);
				}
			} catch {
				// Fallback if inventory collection does not exist
			}
			
			// 3. LPOs
			const lpoQuery = query(collection(db, 'lpos'), orderBy('createdAt', 'desc'));
			const lpoSnapshot = await getDocs(lpoQuery);
			const lpos = lpoSnapshot.docs.map((docSnap) => docSnap.data());
			
			setTotalLposCount(lpos.length);
			const sumValue = lpos.reduce((acc, lpo: { total?: number }) => acc + (lpo.total || 0), 0);
			setTotalLpoValue(sumValue);
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
		} finally {
			setLoading(false);
		}
	}, []);
	
	useEffect(() => {
		fetchDashboardData().catch((err) => console.error('Dashboard data fetch failed:', err));
	}, [fetchDashboardData]);
	
	if (!user) return null;
	
	const stats = [
		{
			title: 'Accessory Requests',
			value: totalRequestsCount.toLocaleString(),
			bgColor: 'var(--mantine-color-myColor-light)',
			iconColor: 'myColor',
			icon: IconFileText,
			desc: `${pendingRequestsCount} pending store release`,
		},
		{
			title: 'Active LPOs',
			value: totalLposCount.toLocaleString(),
			bgColor: 'var(--mantine-color-blue-light)',
			iconColor: 'blue',
			icon: IconReceipt2,
			desc: `AED ${totalLpoValue.toLocaleString()} order value`,
		},
		{
			title: 'Stock Details (Alerts)',
			value: `${outOfStockCount} Out / ${minStockCount} Min`,
			bgColor: 'var(--mantine-color-orange-light)',
			iconColor: 'orange',
			icon: IconAlertCircle,
			desc: 'Items requiring store attention',
		},
	];
	
	const storedUser = localStorage.getItem('ciji_user');
	console.log(storedUser);
	
	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'Approved':
			case 'Completed':
				return <Badge color="teal" variant="light" size="xs">Completed</Badge>;
			case 'Request':
			case 'Pending':
				return <Badge color="yellow" variant="light" size="xs">Pending</Badge>;
			case 'Partially Ordered':
			case 'Processing':
				return <Badge color="blue" variant="light" size="xs">Processing</Badge>;
			default:
				return <Badge color="gray" variant="light" size="xs">{status}</Badge>;
		}
	};
	
	return (
		<Container size="xl" p={0} style={{ width: '100%' }}>
			<Stack gap="md">
				{/* Modern Primary Themed Banner with User Display Name */}
				<Paper
					p="xl"
					radius="md"
					withBorder
					style={{
						backgroundColor: 'var(--mantine-color-myColor-9)',
						color: '#fff',
						boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
					}}
				>
					<Group justify="space-between" align="center">
						<Group gap="md">
							<Avatar
								size={52}
								radius="xl"
								color="white"
								style={{ color: 'var(--mantine-color-myColor-9)', fontWeight: 700, fontSize: '18px' }}
							>
								{user.name ? user.name.charAt(0).toUpperCase() : 'U'}
							</Avatar>
							<Box>
								<Group gap="xs" mb={4}>
									<Title order={3} fw={800} c="white">
										Welcome, {user.name || user.username}
									</Title>
									<Badge color="white" variant="light" size="sm" style={{ color: 'var(--mantine-color-myColor-9)', fontWeight: 700 }}>
										{user.role || 'Admin'}
									</Badge>
								</Group>
								<Text size="xs" style={{ opacity: 0.9 }}>
									Department: <Text span fw={600}>{user.department || 'Accessories Store Management'}</Text> | Real-time Inventory & LPO Oversight
								</Text>
							</Box>
						</Group>
						
						<Button
							size="sm"
							variant="white"
							color="myColor"
							fw={700}
							leftSection={<IconPlus size={16} />}
							onClick={() => router.push('/requests/new-request')}
						>
							New Request
						</Button>
					</Group>
				</Paper>
				
				{/* 3 Metric Cards */}
				<Grid>
					{stats.map((stat) => (
						<Grid.Col span={{ base: 12, sm: 4 }} key={stat.title}>
							<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
								<Group justify="space-between" align="flex-start" mb="xs">
									<ThemeIcon size={38} radius="md" variant="light" color={stat.iconColor} style={{ backgroundColor: stat.bgColor }}>
										<stat.icon size={20} />
									</ThemeIcon>
								</Group>
								<Text size="11px" c="dimmed" fw={600} tt="uppercase">
									{stat.title}
								</Text>
								<Title order={3} fw={700} mt={2} mb={4}>
									{stat.value}
								</Title>
								<Text size="xs" c="dimmed">
									{stat.desc}
								</Text>
							</Paper>
						</Grid.Col>
					))}
				</Grid>
				
				{/* Distribution & Quick Controls Grid */}
				<Grid>
					{/* Category Distribution */}
					<Grid.Col span={{ base: 12, md: 7 }}>
						<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)', height: '100%' }}>
							<Group justify="space-between" mb="sm">
								<Group gap="xs">
									<ThemeIcon color="myColor" variant="light" size="sm" radius="sm">
										<IconCategory size={16} />
									</ThemeIcon>
									<Title order={5} fw={600}>Stock Category Distribution</Title>
								</Group>
								<Button variant="subtle" color="myColor" size="compact-xs" onClick={() => router.push('/inventory')}>
									View Inventory
								</Button>
							</Group>
							
							{loading ? (
								<Center p="lg">
									<Loader color="myColor" size="xs" />
								</Center>
							) : (
								<Stack gap="sm" mt="xs">
									{inventoryCategories.map((cat) => (
										<Box key={cat.label}>
											<Group justify="space-between" mb={4}>
												<Text size="xs" fw={500}>{cat.label}</Text>
												<Group gap="xs">
													<Text size="xs" c="dimmed">{cat.stock}</Text>
													<Badge size="xs" variant="subtle" color={cat.color}>{cat.percentage}%</Badge>
												</Group>
											</Group>
											<Progress value={cat.percentage} color={cat.color} size="xs" radius="xl" />
										</Box>
									))}
								</Stack>
							)}
						</Paper>
					</Grid.Col>
					
					{/* Quick Operations Hub */}
					<Grid.Col span={{ base: 12, md: 5 }}>
						<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)', height: '100%' }}>
							<Group gap="xs" mb="sm">
								<ThemeIcon color="blue" variant="light" size="sm" radius="sm">
									<IconActivity size={16} />
								</ThemeIcon>
								<Title order={5} fw={600}>Procurement Hub</Title>
							</Group>
							
							<Stack gap="xs">
								<Card p="xs" radius="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
									<Group justify="space-between" align="center">
										<Group gap="xs">
											<ThemeIcon color="teal" variant="light" size="xs">
												<IconShieldCheck size={12} />
											</ThemeIcon>
											<Text size="xs" fw={600}>Firestore Sync Active</Text>
										</Group>
										<Badge size="xs" color="teal">Online</Badge>
									</Group>
								</Card>
								
								<Card p="xs" radius="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
									<Group justify="space-between" align="center">
										<Group gap="xs">
											<ThemeIcon color="yellow" variant="light" size="xs">
												<IconClock size={12} />
											</ThemeIcon>
											<Text size="xs" fw={600}>{totalLposCount} Total LPOs</Text>
										</Group>
										<Button size="compact-xs" variant="light" color="yellow" onClick={() => router.push('/lpo')}>View</Button>
									</Group>
								</Card>
								
								<Card p="xs" radius="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
									<Group justify="space-between" align="center">
										<Group gap="xs">
											<ThemeIcon color="myColor" variant="light" size="xs">
												<IconAlertTriangle size={12} />
											</ThemeIcon>
											<Text size="xs" fw={600}>{pendingRequestsCount} Pending Requisitions</Text>
										</Group>
										<Button size="compact-xs" color="myColor" onClick={() => router.push('/lpo')}>Process</Button>
									</Group>
								</Card>
							</Stack>
						</Paper>
					</Grid.Col>
				</Grid>
				
				{/* Requisitions Compact Table */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" mb="sm">
						<div>
							<Title order={5} fw={600}>Recent Store Requisitions</Title>
							<Text size="10px" c="dimmed">Synced directly from Firestore database</Text>
						</div>
						<Button
							variant="subtle"
							color="myColor"
							size="xs"
							rightSection={<IconArrowUpRight size={12} />}
							onClick={() => router.push('/requests')}
						>
							View All
						</Button>
					</Group>
					
					{loading ? (
						<Center p="lg">
							<Loader color="myColor" size="xs" />
						</Center>
					) : recentRequests.length === 0 ? (
						<Center p="lg">
							<Text size="xs" c="dimmed">No active requisitions found.</Text>
						</Center>
					) : (
						<Table.ScrollContainer minWidth={550}>
							<Table verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover>
								<Table.Thead style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
									<Table.Tr>
										<Table.Th>Request ID</Table.Th>
										<Table.Th>Accessory Item</Table.Th>
										<Table.Th>Project</Table.Th>
										<Table.Th>Quantity</Table.Th>
										<Table.Th style={{ textAlign: 'right' }}>Status</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{recentRequests.map((req) => (
										<Table.Tr key={req.id}>
											<Table.Td fw={600}><Text c="myColor.7" size="xs" span>{req.id}</Text></Table.Td>
											<Table.Td><Text size="xs" span>{req.item}</Text></Table.Td>
											<Table.Td><Text size="xs" span>{req.section}</Text></Table.Td>
											<Table.Td><Text fw={500} size="xs" span>{req.qty}</Text></Table.Td>
											<Table.Td style={{ textAlign: 'right' }}>{getStatusBadge(req.status)}</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						</Table.ScrollContainer>
					)}
				</Paper>
			</Stack>
		</Container>
	);
}