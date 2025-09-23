'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { lightTheme, darkTheme } from '@/lib/theme';

interface MuiThemeContextType {
	isDark: boolean;
	toggleTheme: () => void;
}

const MuiThemeContext = createContext<MuiThemeContextType | undefined>(undefined);

export function useMuiTheme() {
	const context = useContext(MuiThemeContext);
	if (context === undefined) {
		// Return default values during SSR or when context is not available
		return {
			isDark: false,
			toggleTheme: () => {},
		};
	}
	return context;
}

interface MuiThemeProviderProps {
	children: React.ReactNode;
}

export function MuiThemeProviderWrapper({ children }: MuiThemeProviderProps) {
	const { theme, setTheme } = useNextTheme();
	useEffect(() => {
		// Component mounted
	}, []);

	const isDark =
		theme === 'dark' ||
		(theme === 'system' &&
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches);

	const toggleTheme = () => {
		setTheme(isDark ? 'light' : 'dark');
	};

	// Always provide the context, even during SSR
	const contextValue = { isDark, toggleTheme };

	return (
		<MuiThemeContext.Provider value={contextValue}>
			<MuiThemeProvider theme={isDark ? darkTheme : lightTheme}>
				<CssBaseline />
				{children}
			</MuiThemeProvider>
		</MuiThemeContext.Provider>
	);
}
