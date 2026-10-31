import '@mantine/core/styles.css';
import React from 'react';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps, createTheme, MantineColorsTuple } from '@mantine/core';
import './globals.css'; // or your global tailwind/css import

// Clean monochromatic scale from pure white/light tint to pure black primary
const myColor: MantineColorsTuple = [
	'#ffffff', // 0: Pure white background/light accents
	'#f0f0f0', // 1: Very light grey tint
	'#d9d9d9', // 2: Light grey
	'#bfbfbf', // 3: Soft grey border
	'#8c8c8c', // 4: Mid-tone grey for disabled/muted elements
	'#595959', // 5: Darker grey for secondary text
	'#262626', // 6: Deep charcoal
	'#1a1a1a', // 7: Near black
	'#0d0d0d', // 8: Deep black
	'#000000'  // 9: Pure Primary Black (#000)
];

const theme = createTheme({
	colors: {
		myColor,
	},
	primaryColor: 'myColor',
	// Optional: Set default shades so primary buttons map directly to pure black
	primaryShade: { light: 9, dark: 0 },
});

export const metadata = {
	title: 'Electron Mantine App',
	description: 'Built with Electron, Next.js, and Mantine',
};

export default function RootLayout({
	                                   children,
                                   }: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" {...mantineHtmlProps}>
		<head>
			{/* Required for Mantine color scheme persistence and avoiding flash of light theme */}
		</head>
		<body>
		<MantineProvider theme={theme} defaultColorScheme="light">
			{children}
		</MantineProvider>
		</body>
		</html>
	);
}