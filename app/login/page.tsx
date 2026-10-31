
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
	Paper,
	TextInput,
	PasswordInput,
	Button,
	Title,
	Text,
	Stack,
	Box,
	Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUser, IconLock, IconAlertCircle } from '@tabler/icons-react';
import {
	collection,
	query,
	where,
	getDocs,
	limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

type LoginValues = {
	username: string;
	password: string;
};

type UserData = {
	username?: string;
	password?: string;
	name?: string;
	role?: string;
	department?: string;
};

export default function LoginPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [loginError, setLoginError] = useState('');

	const form = useForm<LoginValues>({
		initialValues: {
			username: '',
			password: '',
		},
		validate: {
			username: (value) =>
				value.trim().length > 0 ? null : 'Username is required',
			password: (value) =>
				value.length > 0 ? null : 'Password is required',
		},
	});

	const handleSubmit = async (values: LoginValues) => {
		setLoading(true);
		setLoginError('');

		try {
			const usersRef = collection(db, 'users');

			const userQuery = query(
				usersRef,
				where('username', '==', values.username.trim()),
				limit(1)
			);

			const snapshot = await getDocs(userQuery);

			if (snapshot.empty) {
				form.setFieldError('username', 'User not found');
				return;
			}

			const userData = snapshot.docs[0].data() as UserData;

			if (
				!userData.password ||
				userData.password !== values.password
			) {
				form.setFieldError('password', 'Incorrect password');
				return;
			}

			const userInfo = {
				username: userData.username ?? values.username.trim(),
				name: userData.name ?? userData.username ?? values.username.trim(),
				role: userData.role ?? 'user',
				department: userData.department ?? 'general',
			};

			// Browser storage is used only on the client.
			localStorage.setItem('ciji_user', JSON.stringify(userInfo));

			router.push('/dashboard');
		} catch (error) {
			console.error('Login error:', error);
			setLoginError(
				'Unable to sign in. Please check your connection and try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			style={{
				display: 'flex',
				minHeight: '100vh',
				width: '100%',
				overflow: 'hidden',
				backgroundColor: '#FFFFFF',
			}}
		>
			{/* Left hero image */}
			<Box
				visibleFrom="md"
				style={{
					flex: 1,
					position: 'relative',
					minHeight: '100vh',
					backgroundColor: '#F2F4F7',
				}}
			>
				<Image
					src="./images/building-hero.jpg"
					alt="CIJI architectural projects"
					fill
					priority
					sizes="50vw"
					style={{ objectFit: 'cover' }}
				/>
			</Box>

			{/* Login area */}
			<Box
				style={{
					flex: 1,
					minWidth: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 'clamp(24px, 5vw, 64px)',
					backgroundColor: '#FFFFFF',
				}}
			>
				{/* Company logo */}
				<Box
					style={{
						position: 'relative',
						width: 160,
						height: 80,
						marginBottom: 32,
					}}
				>
					<Image
						src="./images/logo.png"
						alt="CIJI Aluminium"
						fill
						priority
						sizes="160px"
						style={{ objectFit: 'contain' }}
					/>
				</Box>

				<Paper
					radius="lg"
					p="xl"
					withBorder
					style={{
						width: '100%',
						maxWidth: 440,
						boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
						backgroundColor: '#FFFFFF',
					}}
				>
					<Stack gap="xs" mb="xl">
						<Title
							order={2}
							style={{
								color: '#1A1A1A',
								fontWeight: 700,
							}}
						>
							Welcome back
						</Title>

						<Text size="sm" c="dimmed">
							Please enter your credentials to access your account.
						</Text>
					</Stack>

					{loginError && (
						<Alert
							icon={<IconAlertCircle size={18} />}
							color="red"
							variant="light"
							mb="md"
						>
							{loginError}
						</Alert>
					)}

					<form onSubmit={form.onSubmit(handleSubmit)}>
						<Stack gap="md">
							<TextInput
								label="Username"
								placeholder="Enter your username"
								leftSection={<IconUser size={18} stroke={1.5} />}
								radius="md"
								size="md"
								autoComplete="username"
								required
								{...form.getInputProps('username')}
								disabled={loading}
							/>

							<PasswordInput
								label="Password"
								placeholder="Enter your password"
								leftSection={<IconLock size={18} stroke={1.5} />}
								radius="md"
								size="md"
								autoComplete="current-password"
								required
								{...form.getInputProps('password')}
								disabled={loading}
							/>

							<Button
								type="submit"
								fullWidth
								radius="md"
								size="md"
								mt="sm"
								loading={loading}
								loaderProps={{ type: 'dots' }}
								style={{
									backgroundColor: '#0F52BA',
								}}
							>
								Sign In
							</Button>
						</Stack>
					</form>
				</Paper>
			</Box>
		</Box>
	);
}
