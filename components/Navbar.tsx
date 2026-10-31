'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
	IconLayoutDashboard,
	IconFileText,
	IconReceipt2,
	IconBoxSeam,
	IconUsers,
	IconPlus,
	IconLogout,
	IconTruckDelivery,
	IconBuildingFactory2,
	IconBuildingStore,
} from '@tabler/icons-react';
import {
	ActionIcon,
	Group,
	Text,
	Tooltip,
	UnstyledButton,
	Avatar,
	Box,
	rem,
} from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';

const links = [
	{ icon: IconLayoutDashboard, label: 'Dashboards', href: '/dashboard', key: 'dashboards' },
	{ icon: IconFileText, label: 'Requests', href: '/requests', key: 'requests' },
	{ icon: IconReceipt2, label: 'LPO Management', href: '/lpo', key: 'lpo' },
	{ icon: IconTruckDelivery, label: 'Goods Receipt', href: '/goods-receipts', key: 'goods-receipts' },
	{ icon: IconBoxSeam, label: 'Store Inventory', href: '/inventory', key: 'inventory' },
	{ icon: IconBuildingFactory2, label: 'Aluminum Profiles', href: '/aluminum', key: 'aluminum' },
	{ icon: IconBuildingStore, label: 'Suppliers', href: '/suppliers', key: 'suppliers' },
];

const adminMenu = [
	{ icon: IconUsers, label: 'Users', href: '/admin/users', key: 'users' },
];

export function Navbar() {
	const router = useRouter();
	const pathname = usePathname();
	const [currentUser, setCurrentUser] = useState<{ name: string; username: string; role: string; department: string } | null>(null);
	
	useEffect(() => {
		const stored = localStorage.getItem('ciji_user');
		if (stored) {
			try {
				setCurrentUser(JSON.parse(stored));
			} catch (e) {
				console.error('Failed to parse user session', e);
			}
		}
	}, []);
	
	const handleLogout = () => {
		localStorage.removeItem('ciji_user');
		router.push('/login');
	};
	
	const userRole = currentUser?.role?.toLowerCase() || 'admin';
	
	// Role-based visibility check function
	const canSeeItem = (key: string) => {
		if (userRole === 'admin') return true;
		if (userRole === 'procurement') return ['dashboards', 'lpo', 'inventory', 'suppliers'].includes(key);
		if (userRole === 'storekeeper') return ['dashboards', 'requests', 'inventory', 'goods-receipts'].includes(key);
		if (userRole === 'engineer') return ['dashboards', 'requests', 'inventory', 'goods-receipts', 'aluminum'].includes(key);
		return false;
	};
	
	const mainLinks = links
		.filter((link) => canSeeItem(link.key))
		.map((link) => {
			const isActive = pathname === link.href;
			return (
				<UnstyledButton
					key={link.label}
					onClick={() => router.push(link.href)}
					style={{
						display: 'flex',
						alignItems: 'center',
						width: '100%',
						fontSize: rem(13),
						padding: `${rem(10)} ${rem(12)}`,
						borderRadius: rem(8),
						fontWeight: isActive ? 600 : 500,
						backgroundColor: isActive ? 'var(--mantine-color-myColor-light)' : 'transparent',
						color: isActive ? 'var(--mantine-color-myColor-9)' : 'inherit',
						transition: 'background-color 150ms ease',
					}}
					className="hover:bg-gray-100 dark:hover:bg-dark-6"
				>
					<Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">
						<Group gap="sm" wrap="nowrap">
							<link.icon
								size={20}
								style={{
									color: isActive ? 'var(--mantine-color-myColor-9)' : 'var(--mantine-color-dimmed)',
								}}
								stroke={1.6}
							/>
							<Text size="sm">{link.label}</Text>
						</Group>
					</Group>
				</UnstyledButton>
			);
		});
	
	const adminMenuLinks = adminMenu
		.filter((item) => userRole === 'admin') // Admin section strictly for admins
		.map((item) => {
			const isActive = pathname === item.href;
			return (
				<UnstyledButton
					key={item.label}
					onClick={() => router.push(item.href)}
					style={{
						display: 'flex',
						alignItems: 'center',
						width: '100%',
						fontSize: rem(13),
						padding: `${rem(9)} ${rem(12)}`,
						borderRadius: rem(8),
						fontWeight: isActive ? 600 : 500,
						backgroundColor: isActive ? 'var(--mantine-color-myColor-light)' : 'transparent',
						color: isActive ? 'var(--mantine-color-myColor-9)' : 'inherit',
						transition: 'background-color 150ms ease',
					}}
					className="hover:bg-gray-100 dark:hover:bg-dark-6"
				>
					<Group gap="sm" wrap="nowrap">
						<item.icon
							size={18}
							style={{
								color: isActive ? 'var(--mantine-color-myColor-9)' : 'var(--mantine-color-dimmed)',
							}}
							stroke={1.5}
						/>
						<Text size="sm">{item.label}</Text>
					</Group>
				</UnstyledButton>
			);
		});
	
	return (
		<Box
			component="nav"
			style={{
				width: rem(300),
				height: '100vh',
				padding: rem(16),
				display: 'flex',
				flexDirection: 'column',
				boxShadow: 'var(--mantine-shadow-xl)',
				zIndex: 20,
				position: 'relative',
				borderRight: '1px solid var(--mantine-color-default-border)',
			}}
			className="bg-white dark:bg-dark-8"
		>
			{/* Header with Logo & Brand */}
			<Box
				style={{
					padding: rem(12),
					marginBottom: rem(12),
					borderRadius: rem(10),
					boxShadow: 'var(--mantine-shadow-xs)',
					display: 'flex',
					alignItems: 'center',
					gap: rem(12),
				}}
				className="bg-gray-50/70 dark:bg-dark-7/50"
			>
				<Image
					src="/images/logo.png"
					alt="CIJI Logo"
					width={32}
					height={32}
					style={{ objectFit: 'contain' }}
				/>
				<div style={{ lineHeight: 1.1 }}>
					<Text size="sm" fw={700}>
						CIJI Architecture
					</Text>
					<Text size="10px" c="dimmed">
						Accessories Store System
					</Text>
				</div>
			</Box>
			
			{/* User Session Profile Header */}
			<Box
				style={{
					padding: rem(12),
					marginBottom: rem(16),
					borderRadius: rem(10),
					boxShadow: 'var(--mantine-shadow-xs)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
				className="bg-gray-50/70 dark:bg-dark-7/50"
			>
				<Group gap="sm" wrap="nowrap">
					<Avatar size="md" color="myColor" radius="xl">
						{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
					</Avatar>
					<div style={{ lineHeight: 1.2 }}>
						<Text size="sm" fw={600}>
							{currentUser?.name || 'User'}
						</Text>
						<Text size="xs" c="dimmed" tt="capitalize">
							{currentUser?.role || 'account'}
						</Text>
					</div>
				</Group>
				
				<Tooltip label="Logout" withArrow position="right">
					<ActionIcon color="red" variant="subtle" size="sm" onClick={handleLogout} aria-label="Logout">
						<IconLogout size={16} />
					</ActionIcon>
				</Tooltip>
			</Box>
			
			{/* Main Links */}
			<Box style={{ marginBottom: rem(16) }}>
				{mainLinks}
			</Box>
			
			{/* Admin Menu (Only shown if user is admin) */}
			{userRole === 'admin' && (
				<Box style={{ flex: 1, overflowY: 'auto' }}>
					<Group px="xs" mb={8} justify="space-between">
						<Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
							Admin Menu
						</Text>
						<Tooltip label="Add item" withArrow position="right">
							<ActionIcon variant="subtle" color="gray" size={20} aria-label="Add item">
								<IconPlus size={14} stroke={1.5} />
							</ActionIcon>
						</Tooltip>
					</Group>
					<Box>{adminMenuLinks}</Box>
				</Box>
			)}
		</Box>
	);
}