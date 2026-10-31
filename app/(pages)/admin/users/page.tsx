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
	PasswordInput,
	Select,
	NumberInput,
	ActionIcon,
	Modal,
	Loader,
	Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import {
	IconSearch,
	IconPlus,
	IconEdit,
	IconTrash,
	IconRefresh,
	IconUserShield,
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

interface UserData {
	id: string;
	department: string;
	name: string;
	password?: string;
	role: string;
	uid?: string;
	'user-code': number;
	username: string;
	createdAt?: Timestamp;
}

interface FormValues {
	name: string;
	username: string;
	department: string;
	role: string;
	userCode: number;
	password?: string;
}

export default function UsersManagementPage() {
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(true);

	// Filters & Search
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState<string | null>('All');

	// Modal State
	const [opened, { open, close }] = useDisclosure(false);
	const [editingUserId, setEditingUserId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// Mantine useForm Hook setup
	const form = useForm<FormValues>({
		initialValues: {
			name: '',
			username: '',
			department: 'admin',
			role: 'admin',
			userCode: 1,
			password: '',
		},
		validate: {
			name: (value) => (value.trim().length < 2 ? 'Display Name must be at least 2 characters' : null),
			username: (value) => (value.trim().length < 2 ? 'Username must be at least 2 characters' : null),
			department: (value) => (!value.trim() ? 'Department is required' : null),
			role: (value) => (!value ? 'Role is required' : null),
			userCode: (value) => (value < 1 ? 'User code must be at least 1' : null),
		},
	});

	// Fetch Users from Firestore
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const q = query(collection(db, 'users'), orderBy('username', 'asc'));
			const querySnapshot = await getDocs(q);
			const loadedUsers: UserData[] = querySnapshot.docs.map((docSnap) => ({
				id: docSnap.id,
				...(docSnap.data() as Omit<UserData, 'id'>),
			}));
			setUsers(loadedUsers);
		} catch (error) {
			console.error('Error fetching users:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers().catch((err) => console.error('Failed to load users:', err));
	}, [fetchUsers]);

	// Open modal for creation
	const handleOpenCreate = () => {
		setEditingUserId(null);
		form.setValues({
			name: '',
			username: '',
			department: 'admin',
			role: 'admin',
			userCode: users.length + 1,
			password: '',
		});
		form.clearErrors();
		open();
	};

	// Open modal for editing
	const handleOpenEdit = (user: UserData) => {
		setEditingUserId(user.id);
		form.setValues({
			name: user.name || '',
			username: user.username || '',
			department: user.department || 'admin',
			role: user.role || 'admin',
			userCode: user['user-code'] || 1,
			password: '',
		});
		form.clearErrors();
		open();
	};

	// Save or Update User via useForm Submit Handler
	const handleSaveUser = async (values: FormValues) => {
		try {
			setSubmitting(true);

			const userRef = editingUserId
				? doc(db, 'users', editingUserId)
				: doc(collection(db, 'users'));

			const generatedUid = editingUserId ? (users.find(u => u.id === editingUserId)?.uid || editingUserId) : userRef.id;

			const userData: any = {
				name: values.name.trim(),
				username: values.username.trim(),
				department: values.department.trim(),
				role: values.role.toLowerCase(),
				'user-code': Number(values.userCode),
				uid: generatedUid,
				updatedAt: serverTimestamp(),
			};

			if (!editingUserId) {
				userData.createdAt = serverTimestamp();
			}
			if (values.password) {
				userData.password = values.password;
			}

			await setDoc(userRef, userData, { merge: true });
			close();
			await fetchUsers();
		} catch (error) {
			console.error('Error saving user:', error);
		} finally {
			setSubmitting(false);
		}
	};

	// Delete User
	const handleDeleteUser = async (id: string) => {
		if (!confirm('Are you sure you want to delete this user?')) return;
		try {
			await deleteDoc(doc(db, 'users', id));
			setUsers(users.filter((u) => u.id !== id));
		} catch (error) {
			console.error('Error deleting user:', error);
		}
	};

	// Filter Logic
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			(user.username || '').toLowerCase().includes(search.toLowerCase()) ||
			(user.name || '').toLowerCase().includes(search.toLowerCase()) ||
			(user.department || '').toLowerCase().includes(search.toLowerCase());

		const matchesRole =
			roleFilter === 'All' ||
			!roleFilter ||
			(user.role || '').toLowerCase() === roleFilter.toLowerCase();

		return matchesSearch && matchesRole;
	});

	// Helper for Role Badge Colors using myColor theme mapping
	const getRoleBadgeColor = (r: string) => {
		switch (r?.toLowerCase()) {
			case 'admin':
				return 'myColor';
			case 'procurement':
				return 'dark';
			case 'engineer':
				return 'gray';
			case 'storekeeper':
			default:
				return 'myColor';
		}
	};

	return (
		<Container size="lg" p={0} style={{ width: '100%' }}>
			<Stack gap="xl">

				{/* Page Header */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group justify="space-between" align="center">
						<div>
							<Title order={3}>User & Access Management</Title>
							<Text size="xs" c="dimmed">
								Manage accounts, departments, roles, and auto-generated uids
							</Text>
						</div>
						<Group gap="xs">
							<ActionIcon
								variant="default"
								size="lg"
								onClick={() => {
									fetchUsers().catch((err) => console.error('Failed to refresh users:', err));
								}}
								title="Refresh Users"
							>
								<IconRefresh size={18} />
							</ActionIcon>
							<Button
								leftSection={<IconPlus size={16} />}
								color="myColor"
								onClick={handleOpenCreate}
							>
								Create User
							</Button>
						</Group>
					</Group>
				</Paper>

				{/* Filters & Search Bar */}
				<Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
					<Group grow align="flex-end">
						<TextInput
							label="Search Users"
							placeholder="Search by name, username, department..."
							leftSection={<IconSearch size={16} />}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Select
							label="Role Filter"
							data={['All', 'admin', 'storekeeper', 'procurement', 'engineer']}
							value={roleFilter}
							onChange={setRoleFilter}
						/>
					</Group>
				</Paper>

				{/* Users List Table */}
				<Stack gap="sm">
					<Title order={4}>Registered System Users</Title>
					<Paper p="xl" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
						{loading ? (
							<Center p="xl">
								<Loader color="myColor" size="md" />
							</Center>
						) : filteredUsers.length === 0 ? (
							<Center p="xl">
								<Text size="xs" c="dimmed">No users found matching your search.</Text>
							</Center>
						) : (
							<Table withTableBorder>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Code</Table.Th>
										<Table.Th>Display Name</Table.Th>
										<Table.Th>Username</Table.Th>
										<Table.Th>Department</Table.Th>
										<Table.Th>Role</Table.Th>
										<Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{filteredUsers.map((user) => (
										<Table.Tr key={user.id}>
											<Table.Td fw={700}>#{user['user-code'] || '-'}</Table.Td>
											<Table.Td fw={600}>{user.name}</Table.Td>
											<Table.Td fw={500} c="myColor.6">{user.username}</Table.Td>
											<Table.Td>
												<Badge size="sm" variant="outline" color="gray">
													{user.department || '-'}
												</Badge>
											</Table.Td>
											<Table.Td>
												<Badge
													size="sm"
													variant="light"
													color={getRoleBadgeColor(user.role)}
												>
													{user.role}
												</Badge>
											</Table.Td>
											<Table.Td style={{ textAlign: 'right' }}>
												<Group gap="xs" justify="flex-end">
													<ActionIcon
														variant="subtle"
														color="myColor"
														onClick={() => handleOpenEdit(user)}
														title="Edit User"
													>
														<IconEdit size={16} />
													</ActionIcon>
													<ActionIcon
														variant="subtle"
														color="red"
														onClick={() => handleDeleteUser(user.id)}
														title="Delete User"
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
				</Stack>
			</Stack>

			{/* Create / Edit User Modal using Mantine useForm */}
			<Modal
				opened={opened}
				onClose={close}
				title={
					<Group gap="xs">
						<IconUserShield size={20} color="var(--mantine-color-myColor-6)" />
						<Text fw={700}>{editingUserId ? 'Edit User Account' : 'Create New User'}</Text>
					</Group>
				}
				centered
				radius="md"
			>
				<form onSubmit={form.onSubmit(handleSaveUser)}>
					<Stack gap="md">
						<Group grow align="flex-start">
							<TextInput
								label="Display Name"
								placeholder="e.g. Admin"
								{...form.getInputProps('name')}
								required
							/>
							<NumberInput
								label="User Code"
								placeholder="1"
								{...form.getInputProps('userCode')}
								required
								min={1}
							/>
						</Group>

						<TextInput
							label="Username"
							placeholder="e.g. admin"
							{...form.getInputProps('username')}
							required
						/>

						<Group grow align="flex-start">
							<TextInput
								label="Department"
								placeholder="e.g. admin"
								{...form.getInputProps('department')}
								required
							/>
							<Select
								label="Role"
								data={['admin', 'storekeeper', 'procurement', 'engineer']}
								{...form.getInputProps('role')}
								required
							/>
						</Group>

						<PasswordInput
							label="Password"
							placeholder={editingUserId ? 'Leave blank to keep existing password' : 'Enter password'}
							{...form.getInputProps('password')}
						/>

						<Group justify="flex-end" mt="md">
							<Button variant="default" onClick={close}>Cancel</Button>
							<Button type="submit" color="myColor" loading={submitting}>
								{editingUserId ? 'Update User' : 'Save User'}
							</Button>
						</Group>
					</Stack>
				</form>
			</Modal>
		</Container>
	);
}