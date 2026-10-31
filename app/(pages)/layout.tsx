'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { hasPageAccess } from '@/lib/rbac';
import { Container, Title, Text, Button, Stack, Center, Paper } from '@mantine/core';
import { IconLockExclamation } from '@tabler/icons-react';

export default function AppLayout({ children }: { children?: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	
	// Retrieve user session role from localStorage
	const currentUser = typeof window !== 'undefined' ? localStorage.getItem('ciji_user') : null;
	let userRole = 'admin';
	if (currentUser) {
		try {
			const parsed = JSON.parse(currentUser);
			userRole = parsed.role?.toLowerCase() || 'admin';
		} catch (e) {
			console.error('Failed to parse user session', e);
		}
	}
	
	// Check if the current user's role has permission to view this pathname
	const isAllowed = hasPageAccess(userRole, pathname);
	
	return (
		<div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-dark-9">
			{/* Left Sidebar Navbar */}
			<Navbar />
			
			{/* Main Content Area */}
			<main className="flex-1 flex flex-col h-full overflow-y-auto p-8">
				{!isAllowed ? (
					<Center style={{ height: '100%' }}>
						<Paper p="xl" radius="md" withBorder shadow="md" style={{ maxWidth: 450, width: '100%' }}>
							<Stack align="center" gap="md">
								<IconLockExclamation size={48} color="var(--mantine-color-red-6)" />
								<Title order={3} c="red.7" ta="center">Access Restricted</Title>
								<Text size="sm" c="dimmed" ta="center">
									Your current account role (<Text span fw={700} tt="uppercase">{userRole}</Text>) does not have authorized permission to access <Text span fw={600}>{pathname}</Text>.
								</Text>
								<Button
									variant="light"
									color="myColor"
									fullWidth
									mt="sm"
									onClick={() => router.push('/dashboard')}
								>
									Return to Dashboard
								</Button>
							</Stack>
						</Paper>
					</Center>
				) : (
					children || <div>Welcome to the Dashboard Workspace</div>
				)}
			</main>
		</div>
	);
}