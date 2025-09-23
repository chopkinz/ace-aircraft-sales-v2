'use client';

import React, { useState, useEffect } from 'react';
import {
	Container,
	Typography,
	Box,
	Card,
	CardContent,
	useTheme,
	Avatar,
	Chip,
	Fade,
	Grow,
	LinearProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Divider,
	IconButton,
	Tooltip,
	Alert,
	AlertTitle,
} from '@mui/material';
import {
	Timeline as TimelineIcon,
	CheckCircle as CheckCircleIcon,
	Info as InfoIcon,
	Warning as WarningIcon,
	Error as ErrorIcon,
	Refresh as RefreshIcon,
	Storage as StorageIcon,
	Api as ApiIcon,
	Sync as SyncIcon,
	Schedule as ScheduleIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { SyncLog } from '@prisma/client';

interface ActivityItem {
	id: string;
	type: string;
	description: string;
	timestamp: string;
	status: 'success' | 'error' | 'pending';
	details?: string;
}

export default function LogsPage() {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const theme = useTheme();

	const fetchActivities = async () => {
		try {
			setRefreshing(true);
			const response = await fetch('/api/database/sync-logs');
			const data = await response.json();

			if (data.logs) {
				const transformedActivities = data.logs.map((log: any) => ({
					id: log.id,
					type: log.syncType || 'SYNC',
					description: `${log.syncType || 'Data sync'} - ${
						log.recordsProcessed || 0
					} records processed`,
					timestamp: log.completedAt || log.startedAt,
					status:
						log.status === 'COMPLETED' ? 'success' : log.status === 'FAILED' ? 'error' : 'pending',
					details:
						log.errorMessage ||
						`${log.recordsCreated || 0} created, ${log.recordsUpdated || 0} updated`,
				}));
				setActivities(transformedActivities);
			} else {
				setActivities([]);
			}
		} catch (error) {
			console.error('Failed to fetch activities:', error);
			toast.error('Failed to fetch system activities');
			setActivities([]);
		} finally {
			setRefreshing(false);
		}
	};

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			await fetchActivities();
			setLoading(false);
		};
		loadData();
	}, []);

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'success':
				return <CheckCircleIcon color="success" />;
			case 'error':
				return <ErrorIcon color="error" />;
			case 'pending':
				return <WarningIcon color="warning" />;
			default:
				return <InfoIcon color="info" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'success':
				return 'success';
			case 'error':
				return 'error';
			case 'pending':
				return 'warning';
			default:
				return 'default';
		}
	};

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
					<LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
					<Typography variant="h6" color="text.secondary">
						Loading System Logs...
					</Typography>
				</Box>
			</Container>
		);
	}

	return (
		<Box
			sx={{
				minHeight: '100vh',
				background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.light}10 100%)`,
				py: 4,
			}}
		>
			<Container maxWidth="xl">
				{/* Header */}
				<Fade in={true} timeout={600}>
					<Box sx={{ mb: 4 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
							<Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
								<TimelineIcon />
							</Avatar>
							<Box>
								<Typography variant="h4" fontWeight={700} color="primary.main">
									System Activity Logs
								</Typography>
								<Typography variant="body1" color="text.secondary">
									Monitor system activities, sync operations, and recent changes
								</Typography>
							</Box>
						</Box>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
							<Chip
								icon={<ScheduleIcon />}
								label="Real-time Monitoring"
								color="success"
								variant="outlined"
							/>
							<Chip
								icon={<RefreshIcon />}
								label="Auto-refresh"
								color="primary"
								variant="outlined"
							/>
						</Box>
					</Box>
				</Fade>

				{/* System Status Overview */}
				<Fade in={true} timeout={800}>
					<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4 }}>
						<Box sx={{ flex: 1 }}>
							<Grow in={true} timeout={800}>
								<Card
									sx={{
										height: '100%',
										position: 'relative',
										overflow: 'hidden',
										'&:hover': {
											transform: 'translateY(-4px)',
											boxShadow: theme.shadows[8],
										},
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
								>
									<CardContent sx={{ p: 3 }}>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
											<Avatar
												sx={{
													bgcolor: 'success.main',
													color: 'success.contrastText',
													width: 48,
													height: 48,
												}}
											>
												<ApiIcon />
											</Avatar>
											<Box sx={{ flexGrow: 1 }}>
												<Typography variant="h6" fontWeight={600}>
													JetNet API
												</Typography>
												<Chip label="Connected" color="success" size="small" variant="outlined" />
											</Box>
										</Box>
										<Typography variant="body2" color="text.secondary">
											API connection status and health monitoring
										</Typography>
									</CardContent>
								</Card>
							</Grow>
						</Box>

						<Box sx={{ flex: 1 }}>
							<Grow in={true} timeout={1000}>
								<Card
									sx={{
										height: '100%',
										position: 'relative',
										overflow: 'hidden',
										'&:hover': {
											transform: 'translateY(-4px)',
											boxShadow: theme.shadows[8],
										},
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
								>
									<CardContent sx={{ p: 3 }}>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
											<Avatar
												sx={{
													bgcolor: 'info.main',
													color: 'info.contrastText',
													width: 48,
													height: 48,
												}}
											>
												<StorageIcon />
											</Avatar>
											<Box sx={{ flexGrow: 1 }}>
												<Typography variant="h6" fontWeight={600}>
													Database
												</Typography>
												<Chip label="Healthy" color="success" size="small" variant="outlined" />
											</Box>
										</Box>
										<Typography variant="body2" color="text.secondary">
											Database performance and connection status
										</Typography>
									</CardContent>
								</Card>
							</Grow>
						</Box>

						<Box sx={{ flex: 1 }}>
							<Grow in={true} timeout={1200}>
								<Card
									sx={{
										height: '100%',
										position: 'relative',
										overflow: 'hidden',
										'&:hover': {
											transform: 'translateY(-4px)',
											boxShadow: theme.shadows[8],
										},
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
								>
									<CardContent sx={{ p: 3 }}>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
											<Avatar
												sx={{
													bgcolor: 'warning.main',
													color: 'warning.contrastText',
													width: 48,
													height: 48,
												}}
											>
												<SyncIcon />
											</Avatar>
											<Box sx={{ flexGrow: 1 }}>
												<Typography variant="h6" fontWeight={600}>
													Sync Service
												</Typography>
												<Chip label="Running" color="success" size="small" variant="outlined" />
											</Box>
										</Box>
										<Typography variant="body2" color="text.secondary">
											Data synchronization and processing status
										</Typography>
									</CardContent>
								</Card>
							</Grow>
						</Box>
					</Box>
				</Fade>

				{/* Activity Logs */}
				<Fade in={true} timeout={1000}>
					<Card>
						<CardContent>
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									mb: 3,
								}}
							>
								<Typography variant="h6" fontWeight={600}>
									Recent Activity
								</Typography>
								<Tooltip title="Refresh Activity Log">
									<IconButton color="primary" onClick={fetchActivities} disabled={refreshing}>
										<RefreshIcon
											sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
										/>
									</IconButton>
								</Tooltip>
							</Box>

							{activities.length === 0 ? (
								<Alert severity="info" sx={{ mb: 3 }}>
									<AlertTitle>No Recent Activity</AlertTitle>
									System activity logs will appear here once operations begin. Check back after
									performing sync operations or data updates.
								</Alert>
							) : (
								<List sx={{ p: 0 }}>
									{activities.map((activity, index) => (
										<React.Fragment key={activity.id}>
											<ListItem
												sx={{
													py: 2,
													px: 0,
													'&:hover': {
														bgcolor: 'action.hover',
														borderRadius: 1,
													},
												}}
											>
												<ListItemIcon sx={{ minWidth: 40 }}>
													{getStatusIcon(activity.status)}
												</ListItemIcon>
												<ListItemText
													primary={
														<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
															<Typography variant="body2" fontWeight={500}>
																{activity.description}
															</Typography>
															<Chip
																label={activity.status}
																color={
																	getStatusColor(activity.status) as
																		| 'success'
																		| 'error'
																		| 'warning'
																		| 'default'
																}
																size="small"
																variant="outlined"
															/>
														</Box>
													}
													secondary={
														<Box>
															{activity.details && (
																<Typography
																	variant="caption"
																	color="text.secondary"
																	sx={{ display: 'block', mb: 0.5 }}
																>
																	{activity.details}
																</Typography>
															)}
															<Typography variant="caption" color="text.secondary">
																{new Date(activity.timestamp).toLocaleString()}
															</Typography>
														</Box>
													}
												/>
											</ListItem>
											{index < activities.length - 1 && <Divider />}
										</React.Fragment>
									))}
								</List>
							)}
						</CardContent>
					</Card>
				</Fade>
			</Container>
		</Box>
	);
}
