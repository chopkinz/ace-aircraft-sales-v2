import { createTheme, ThemeOptions } from '@mui/material/styles';
import { Inter } from 'next/font/google';

const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
});

// ACE Aircraft Sales Brand Colors
const aceColors = {
	// Primary aviation blue
	primary: {
		50: '#e3f2fd',
		100: '#bbdefb',
		200: '#90caf9',
		300: '#64b5f6',
		400: '#42a5f5',
		500: '#2196f3', // Main ACE blue
		600: '#1e88e5',
		700: '#1976d2',
		800: '#1565c0',
		900: '#0d47a1',
	},
	// Secondary aviation gray
	secondary: {
		50: '#fafafa',
		100: '#f5f5f5',
		200: '#eeeeee',
		300: '#e0e0e0',
		400: '#bdbdbd',
		500: '#9e9e9e',
		600: '#757575',
		700: '#616161',
		800: '#424242',
		900: '#212121',
	},
	// Success green for aviation status
	success: {
		50: '#e8f5e8',
		100: '#c8e6c9',
		200: '#a5d6a7',
		300: '#81c784',
		400: '#66bb6a',
		500: '#4caf50',
		600: '#43a047',
		700: '#388e3c',
		800: '#2e7d32',
		900: '#1b5e20',
	},
	// Warning orange for aviation alerts
	warning: {
		50: '#fff3e0',
		100: '#ffe0b2',
		200: '#ffcc80',
		300: '#ffb74d',
		400: '#ffa726',
		500: '#ff9800',
		600: '#fb8c00',
		700: '#f57c00',
		800: '#ef6c00',
		900: '#e65100',
	},
	// Error red for aviation warnings
	error: {
		50: '#ffebee',
		100: '#ffcdd2',
		200: '#ef9a9a',
		300: '#e57373',
		400: '#ef5350',
		500: '#f44336',
		600: '#e53935',
		700: '#d32f2f',
		800: '#c62828',
		900: '#b71c1c',
	},
	// Aviation info blue
	info: {
		50: '#e1f5fe',
		100: '#b3e5fc',
		200: '#81d4fa',
		300: '#4fc3f7',
		400: '#29b6f6',
		500: '#03a9f4',
		600: '#039be5',
		700: '#0288d1',
		800: '#0277bd',
		900: '#01579b',
	},
};

const lightThemeOptions: ThemeOptions = {
	palette: {
		mode: 'light',
		primary: {
			main: aceColors.primary[500],
			light: aceColors.primary[300],
			dark: aceColors.primary[700],
			contrastText: '#ffffff',
		},
		secondary: {
			main: aceColors.secondary[600],
			light: aceColors.secondary[400],
			dark: aceColors.secondary[800],
			contrastText: '#ffffff',
		},
		success: {
			main: aceColors.success[500],
			light: aceColors.success[300],
			dark: aceColors.success[700],
		},
		warning: {
			main: aceColors.warning[500],
			light: aceColors.warning[300],
			dark: aceColors.warning[700],
		},
		error: {
			main: aceColors.error[500],
			light: aceColors.error[300],
			dark: aceColors.error[700],
		},
		info: {
			main: aceColors.info[500],
			light: aceColors.info[300],
			dark: aceColors.info[700],
		},
		background: {
			default: '#ffffff',
			paper: '#fafafa',
		},
		text: {
			primary: '#212121',
			secondary: '#757575',
		},
		divider: '#e0e0e0',
	},
	typography: {
		fontFamily: inter.style.fontFamily,
		h1: {
			fontSize: '2.5rem',
			fontWeight: 700,
			lineHeight: 1.2,
			letterSpacing: '-0.02em',
		},
		h2: {
			fontSize: '2rem',
			fontWeight: 600,
			lineHeight: 1.3,
			letterSpacing: '-0.01em',
		},
		h3: {
			fontSize: '1.75rem',
			fontWeight: 600,
			lineHeight: 1.4,
		},
		h4: {
			fontSize: '1.5rem',
			fontWeight: 600,
			lineHeight: 1.4,
		},
		h5: {
			fontSize: '1.25rem',
			fontWeight: 600,
			lineHeight: 1.5,
		},
		h6: {
			fontSize: '1.125rem',
			fontWeight: 600,
			lineHeight: 1.5,
		},
		body1: {
			fontSize: '1rem',
			lineHeight: 1.6,
		},
		body2: {
			fontSize: '0.875rem',
			lineHeight: 1.6,
		},
		button: {
			fontWeight: 600,
			textTransform: 'none',
			letterSpacing: '0.02em',
		},
	},
	shape: {
		borderRadius: 12,
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					scrollbarColor: '#bdbdbd #f5f5f5',
					'&::-webkit-scrollbar, & *::-webkit-scrollbar': {
						width: 8,
						height: 8,
					},
					'&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
						borderRadius: 8,
						backgroundColor: '#bdbdbd',
						minHeight: 24,
						border: '2px solid #f5f5f5',
					},
					'&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
						backgroundColor: '#9e9e9e',
					},
					'&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
						borderRadius: 8,
						backgroundColor: '#f5f5f5',
					},
				},
			},
		},
		MuiAppBar: {
			styleOverrides: {
				root: {
					backgroundColor: 'rgba(255, 255, 255, 0.95)',
					backdropFilter: 'blur(20px)',
					borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
					boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					textTransform: 'none',
					fontWeight: 600,
					padding: '10px 24px',
					boxShadow: 'none',
					'&:hover': {
						boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
						transform: 'translateY(-1px)',
					},
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
				},
				contained: {
					background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
					'&:hover': {
						background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
					},
				},
				outlined: {
					borderWidth: 2,
					'&:hover': {
						borderWidth: 2,
						backgroundColor: 'rgba(33, 150, 243, 0.04)',
					},
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 16,
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
					border: '1px solid rgba(0, 0, 0, 0.05)',
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
					'&:hover': {
						boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
						transform: 'translateY(-2px)',
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					borderRadius: 16,
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
				},
				elevation1: {
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
				},
				elevation2: {
					boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
				},
				elevation3: {
					boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					'& .MuiOutlinedInput-root': {
						borderRadius: 12,
						'&:hover .MuiOutlinedInput-notchedOutline': {
							borderColor: aceColors.primary[300],
						},
						'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
							borderColor: aceColors.primary[500],
							borderWidth: 2,
						},
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 20,
					fontWeight: 600,
				},
			},
		},
		MuiTab: {
			styleOverrides: {
				root: {
					textTransform: 'none',
					fontWeight: 600,
					minHeight: 48,
				},
			},
		},
		MuiTabs: {
			styleOverrides: {
				indicator: {
					height: 3,
					borderRadius: '3px 3px 0 0',
				},
			},
		},
	},
};

const darkThemeOptions: ThemeOptions = {
	...lightThemeOptions,
	palette: {
		mode: 'dark',
		primary: {
			main: aceColors.primary[400],
			light: aceColors.primary[300],
			dark: aceColors.primary[600],
			contrastText: '#ffffff',
		},
		secondary: {
			main: aceColors.secondary[400],
			light: aceColors.secondary[300],
			dark: aceColors.secondary[600],
			contrastText: '#ffffff',
		},
		success: {
			main: aceColors.success[400],
			light: aceColors.success[300],
			dark: aceColors.success[600],
		},
		warning: {
			main: aceColors.warning[400],
			light: aceColors.warning[300],
			dark: aceColors.warning[600],
		},
		error: {
			main: aceColors.error[400],
			light: aceColors.error[300],
			dark: aceColors.error[600],
		},
		info: {
			main: aceColors.info[400],
			light: aceColors.info[300],
			dark: aceColors.info[600],
		},
		background: {
			default: '#121212',
			paper: '#1e1e1e',
		},
		text: {
			primary: '#ffffff',
			secondary: '#b3b3b3',
		},
		divider: '#333333',
	},
	components: {
		...lightThemeOptions.components,
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					scrollbarColor: '#424242 #1e1e1e',
					'&::-webkit-scrollbar, & *::-webkit-scrollbar': {
						width: 8,
						height: 8,
					},
					'&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
						borderRadius: 8,
						backgroundColor: '#424242',
						minHeight: 24,
						border: '2px solid #1e1e1e',
					},
					'&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
						backgroundColor: '#616161',
					},
					'&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
						borderRadius: 8,
						backgroundColor: '#1e1e1e',
					},
				},
			},
		},
		MuiAppBar: {
			styleOverrides: {
				root: {
					backgroundColor: 'rgba(30, 30, 30, 0.95)',
					backdropFilter: 'blur(20px)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
					boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundColor: '#1e1e1e',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					'&:hover': {
						boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
					},
				},
			},
		},
	},
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);

export { aceColors };
