'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Plane,
	Wrench,
	Cog,
	MapPin,
	Calendar,
	DollarSign,
	Users,
	Phone,
	Mail,
	Globe,
	FileText,
	TrendingUp,
	Clock,
	CheckCircle,
	XCircle,
	Info,
	Shield,
	Radio,
	Settings,
	Star,
	Heart,
	Zap,
	Activity,
	ArrowUpRight,
} from 'lucide-react';

interface DataFormatterProps {
	data: Record<string, unknown>;
	title: string;
	icon?: React.ReactNode;
	className?: string;
}

const formatValue = (value: unknown): string => {
	if (value === null || value === undefined) return 'N/A';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'number') {
		if (value > 1000000) return `$${(value / 1000000).toFixed(1)}M`;
		if (value > 1000) return `$${(value / 1000).toFixed(0)}K`;
		return value.toLocaleString();
	}
	if (typeof value === 'string') {
		// Check if it's a date
		if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
			return new Date(value).toLocaleDateString();
		}
		return value;
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? `${value.length} items` : 'None';
	}
	if (typeof value === 'object') {
		return Object.keys(value).length > 0 ? `${Object.keys(value).length} properties` : 'None';
	}
	return String(value);
};

const renderValue = (value: unknown): React.ReactNode => {
	if (value === null || value === undefined) {
		return (
			<span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs font-medium">
				N/A
			</span>
		);
	}

	if (typeof value === 'boolean') {
		return (
			<Badge variant={getBadgeVariant(value)} className="inline-flex items-center gap-1 px-2 py-1">
				{value ? (
					<>
						<CheckCircle className="h-3 w-3" />
						Yes
					</>
				) : (
					<>
						<XCircle className="h-3 w-3" />
						No
					</>
				)}
			</Badge>
		);
	}

	if (typeof value === 'number') {
		const formatted = formatValue(value);
		const isPrice = formatted.includes('$');
		return (
			<span
				className={`font-mono text-sm ${
					isPrice ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-foreground'
				}`}
			>
				{formatted}
			</span>
		);
	}

	if (typeof value === 'string') {
		// Check if it's a date
		if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
			const date = new Date(value);
			return (
				<div className="flex items-center gap-2">
					<Calendar className="h-3 w-3 text-muted-foreground" />
					<span className="font-mono text-sm">{date.toLocaleDateString()}</span>
					<span className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</span>
				</div>
			);
		}
		// Check if it's a URL
		if (value.startsWith('http')) {
			return (
				<a
					href={value}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors text-sm font-medium"
				>
					<Globe className="h-3 w-3" />
					<span className="break-words">{value}</span>
					<ArrowUpRight className="h-3 w-3" />
				</a>
			);
		}
		// Check if it's an email
		if (value.includes('@') && value.includes('.')) {
			return (
				<a
					href={`mailto:${value}`}
					className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors text-sm"
				>
					<Mail className="h-3 w-3" />
					{value}
				</a>
			);
		}
		// Check if it's a phone number
		if (value.match(/^[\+]?[1-9][\d\s\-\(\)]{7,}$/)) {
			return (
				<a
					href={`tel:${value}`}
					className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors text-sm font-mono"
				>
					<Phone className="h-3 w-3" />
					{value}
				</a>
			);
		}
		return <span className="text-sm text-foreground break-words">{value}</span>;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return (
				<span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs font-medium">
					Empty Array
				</span>
			);
		}
		return (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs">
						{value.length} items
					</Badge>
				</div>
				<div className="space-y-1 max-h-48 overflow-y-auto">
					{value.map((item, index) => (
						<div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
							<span className="text-muted-foreground flex-shrink-0">#{index + 1}</span>
							<span className="flex-1 break-words">
								{typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (typeof value === 'object' && value !== null) {
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj);
		if (keys.length === 0) {
			return (
				<span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs font-medium">
					Empty Object
				</span>
			);
		}
		return (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs">
						{keys.length} properties
					</Badge>
				</div>
				<div className="space-y-1 max-h-48 overflow-y-auto">
					{keys.map(subKey => (
						<div key={subKey} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs">
							<span className="font-medium text-primary min-w-0 flex-shrink-0">{subKey}:</span>
							<span className="text-muted-foreground flex-1 break-words">
								{typeof obj[subKey] === 'object'
									? JSON.stringify(obj[subKey], null, 2)
									: String(obj[subKey])}
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}

	return <span className="text-sm text-foreground break-words">{String(value)}</span>;
};

const getIconForField = (fieldName: string): React.ReactNode => {
	const iconMap: Record<string, React.ReactNode> = {
		// Basic Info
		manufacturer: <Plane className="h-4 w-4" />,
		model: <Plane className="h-4 w-4" />,
		make: <Plane className="h-4 w-4" />,
		variant: <Plane className="h-4 w-4" />,
		year: <Calendar className="h-4 w-4" />,
		yearManufactured: <Calendar className="h-4 w-4" />,
		yearDelivered: <Calendar className="h-4 w-4" />,
		registration: <FileText className="h-4 w-4" />,
		serialNumber: <FileText className="h-4 w-4" />,
		aircraftId: <FileText className="h-4 w-4" />,

		// Pricing
		price: <DollarSign className="h-4 w-4" />,
		askingPrice: <DollarSign className="h-4 w-4" />,
		currency: <DollarSign className="h-4 w-4" />,
		forSale: <CheckCircle className="h-4 w-4" />,
		status: <Activity className="h-4 w-4" />,
		dateListed: <Calendar className="h-4 w-4" />,

		// Location
		location: <MapPin className="h-4 w-4" />,
		baseCity: <MapPin className="h-4 w-4" />,
		baseState: <MapPin className="h-4 w-4" />,
		baseCountry: <MapPin className="h-4 w-4" />,
		baseAirportId: <MapPin className="h-4 w-4" />,
		baseIcaoCode: <MapPin className="h-4 w-4" />,
		baseIataCode: <MapPin className="h-4 w-4" />,

		// Technical
		totalTimeHours: <Clock className="h-4 w-4" />,
		totalTime: <Clock className="h-4 w-4" />,
		estimatedAftt: <Clock className="h-4 w-4" />,
		engineSn1: <Cog className="h-4 w-4" />,
		engineSn2: <Cog className="h-4 w-4" />,
		avionics: <Radio className="h-4 w-4" />,
		passengers: <Users className="h-4 w-4" />,

		// Market
		marketStatus: <TrendingUp className="h-4 w-4" />,
		exclusive: <Star className="h-4 w-4" />,
		leased: <Shield className="h-4 w-4" />,

		// Contact
		contactName: <Users className="h-4 w-4" />,
		contactPhone: <Phone className="h-4 w-4" />,
		contactEmail: <Mail className="h-4 w-4" />,
		contactWebsite: <Globe className="h-4 w-4" />,

		// System
		createdAt: <Calendar className="h-4 w-4" />,
		updatedAt: <Calendar className="h-4 w-4" />,
		lastUpdated: <Calendar className="h-4 w-4" />,
		dataSource: <Info className="h-4 w-4" />,
	};

	return iconMap[fieldName.toLowerCase()] || <Info className="h-4 w-4" />;
};

const getBadgeVariant = (value: unknown): 'default' | 'secondary' | 'destructive' | 'outline' => {
	if (typeof value === 'boolean') {
		return value ? 'default' : 'secondary';
	}
	if (typeof value === 'string') {
		const lowerValue = value.toLowerCase();
		if (lowerValue.includes('available') || lowerValue.includes('active')) return 'default';
		if (lowerValue.includes('sold') || lowerValue.includes('inactive')) return 'destructive';
		if (lowerValue.includes('pending') || lowerValue.includes('maintenance')) return 'outline';
	}
	return 'secondary';
};

export function DataFormatter({ data, title, icon, className = '' }: DataFormatterProps) {
	if (!data || Object.keys(data).length === 0) {
		return (
			<Card className={`modern-card ${className}`}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						{icon}
						{title}
						<Badge variant="outline" className="text-xs">
							No data
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<div className="text-muted-foreground italic">No data available</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Separate populated and empty fields
	const allEntries = Object.entries(data);
	const populatedEntries = allEntries.filter(
		([, value]) =>
			value !== null &&
			value !== undefined &&
			value !== '' &&
			!(Array.isArray(value) && value.length === 0) &&
			!(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
	);
	const emptyEntries = allEntries.filter(
		([, value]) =>
			value === null ||
			value === undefined ||
			value === '' ||
			(Array.isArray(value) && value.length === 0) ||
			(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
	);

	// If no populated entries, show a minimal empty state
	if (populatedEntries.length === 0) {
		return (
			<Card className={`modern-card ${className}`}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						{icon}
						{title}
						<Badge variant="outline" className="text-xs">
							{allEntries.length} fields (all empty)
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4">
						<div className="text-muted-foreground italic text-sm">
							All {allEntries.length} fields are empty
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (allEntries.length === 0) {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={className}
		>
			<Card className="modern-card">
				<CardHeader className="pb-4">
					<CardTitle className="flex items-center gap-3 text-lg">
						<div className="p-2 rounded-lg bg-primary/10 text-primary">
							{icon || <FileText className="h-5 w-5" />}
						</div>
						<span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							{title}
						</span>
						<div className="ml-auto flex items-center gap-2">
							<Badge variant="default" className="badge-modern">
								{populatedEntries.length} populated
							</Badge>
							{emptyEntries.length > 0 && (
								<Badge variant="outline" className="badge-modern">
									{emptyEntries.length} empty
								</Badge>
							)}
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-0 space-y-6">
					{/* Populated Fields */}
					{populatedEntries.length > 0 && (
						<div className="data-group">
							<div className="data-group-header">Populated Fields ({populatedEntries.length})</div>
							<div className="space-y-3">
								{populatedEntries.map(([key, value], index) => (
									<motion.div
										key={key}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.02 }}
										className="data-field group cursor-pointer hover:bg-muted/30 rounded-lg p-2 transition-colors"
										onClick={() => {
											const textToCopy = `${key}: ${
												typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
											}`;
											navigator.clipboard.writeText(textToCopy);
										}}
									>
										<div className="flex items-center gap-2">
											<div className="flex-shrink-0 p-1 rounded-md bg-primary/10 text-primary">
												{getIconForField(key)}
											</div>
											<span className="data-field-label">
												{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
											</span>
										</div>
										<div className="data-field-value">{renderValue(value)}</div>
									</motion.div>
								))}
							</div>
						</div>
					)}

					{/* Empty Fields */}
					{emptyEntries.length > 0 && (
						<div className="data-group">
							<div className="data-group-header data-field-empty">
								Empty Fields ({emptyEntries.length})
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
								{emptyEntries.map(([key], index) => (
									<motion.div
										key={key}
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ delay: index * 0.01 }}
										className="flex items-center gap-2 p-2 rounded-md bg-muted/20 text-xs text-muted-foreground"
									>
										<div className="flex-shrink-0">{getIconForField(key)}</div>
										<span className="truncate">
											{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
										</span>
									</motion.div>
								))}
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="pt-4 border-t border-border/50">
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>Click populated fields to copy to clipboard</span>
							<span className="flex items-center gap-2">
								<Info className="h-3 w-3" />
								{allEntries.length} total fields
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

// Specialized formatters for complex data structures
export function SpecificationsFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter
			data={data}
			title="Technical Specifications"
			icon={<Cog className="h-5 w-5" />}
		/>
	);
}

export function FeaturesFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Features & Equipment" icon={<Star className="h-5 w-5" />} />
	);
}

export function MarketDataFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter
			data={data}
			title="Market Intelligence"
			icon={<TrendingUp className="h-5 w-5" />}
		/>
	);
}

export function MaintenanceFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Maintenance Records" icon={<Wrench className="h-5 w-5" />} />
	);
}

export function ContactFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Contact Information" icon={<Phone className="h-5 w-5" />} />
	);
}

export function OwnershipFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Ownership History" icon={<Shield className="h-5 w-5" />} />
	);
}

// Enhanced formatter for nested enrichment data
export function EnrichmentFormatter({ enrichment }: { enrichment: Record<string, unknown> }) {
	if (!enrichment || Object.keys(enrichment).length === 0) return null;

	const sections = [
		{ key: 'status', title: 'Status Information', icon: <Activity className="h-5 w-5" /> },
		{ key: 'airframe', title: 'Airframe Details', icon: <Plane className="h-5 w-5" /> },
		{ key: 'engines', title: 'Engine Information', icon: <Cog className="h-5 w-5" /> },
		{ key: 'apu', title: 'APU Details', icon: <Zap className="h-5 w-5" /> },
		{ key: 'avionics', title: 'Avionics Suite', icon: <Radio className="h-5 w-5" /> },
		{ key: 'features', title: 'Aircraft Features', icon: <Star className="h-5 w-5" /> },
		{
			key: 'additionalEquipment',
			title: 'Additional Equipment',
			icon: <Settings className="h-5 w-5" />,
		},
		{ key: 'interior', title: 'Interior Details', icon: <Heart className="h-5 w-5" /> },
		{ key: 'exterior', title: 'Exterior Details', icon: <Plane className="h-5 w-5" /> },
		{ key: 'maintenance', title: 'Maintenance Data', icon: <Wrench className="h-5 w-5" /> },
		{ key: 'relationships', title: 'Company Relationships', icon: <Users className="h-5 w-5" /> },
	];

	return (
		<div className="space-y-6">
			{sections.map(section => {
				const sectionData = enrichment[section.key];
				if (
					!sectionData ||
					(typeof sectionData === 'object' && Object.keys(sectionData).length === 0)
				) {
					return null;
				}

				return (
					<DataFormatter
						key={section.key}
						data={sectionData as Record<string, unknown>}
						title={section.title}
						icon={section.icon}
					/>
				);
			})}
		</div>
	);
}
