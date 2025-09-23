'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
	Code,
	Eye,
	Table,
	Grid3X3,
	Download,
	Camera,
	Monitor,
	Headphones,
	Navigation,
	Radar,
	Wifi,
	Bluetooth,
	Battery,
	Power,
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
		// Check if it's an image URL
		if (
			value.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
			value.includes('image') ||
			value.includes('photo')
		) {
			return (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<NextImage src={value} alt="Aircraft image" className="h-3 w-3 text-muted-foreground" />
						<span className="text-sm font-medium">Image</span>
					</div>
					<div className="relative group">
						<div className="w-full max-w-xs h-32 relative rounded-lg border border-border/30 hover:border-border/60 transition-colors cursor-pointer overflow-hidden">
							<NextImage
								src={value}
								alt="Aircraft image"
								fill
								className="object-cover"
								onError={() => {
									// Handle error by showing placeholder
								}}
							/>
						</div>
						<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => window.open(value, '_blank')}
								className="h-8 px-3 text-xs"
							>
								<ArrowUpRight className="h-3 w-3 mr-1" />
								View Full Size
							</Button>
						</div>
					</div>
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

		// Check if it's an array of image URLs
		const isImageArray = value.every(
			item =>
				typeof item === 'string' &&
				(item.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
					item.includes('image') ||
					item.includes('photo'))
		);

		if (isImageArray) {
			return (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							{value.length} images
						</Badge>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{value.map((imageUrl, index) => (
							<div key={index} className="relative group">
								<div className="w-full h-24 relative rounded-lg border border-border/30 hover:border-border/60 transition-colors cursor-pointer overflow-hidden">
									<NextImage
										src={imageUrl}
										alt={`Aircraft image ${index + 1}`}
										fill
										className="object-cover"
										onError={() => {
											// Handle error by showing placeholder
										}}
									/>
								</div>
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
									<Button
										variant="secondary"
										size="sm"
										onClick={() => window.open(imageUrl, '_blank')}
										className="h-6 px-2 text-xs"
									>
										<ArrowUpRight className="h-3 w-3" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
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

		// Images and Media
		images: <Camera className="h-4 w-4" />,
		photos: <Camera className="h-4 w-4" />,
		image: <Camera className="h-4 w-4" />,
		photo: <Camera className="h-4 w-4" />,
		thumbnail: <Camera className="h-4 w-4" />,
		exterior: <Camera className="h-4 w-4" />,
		interior: <Camera className="h-4 w-4" />,

		// Avionics and Electronics
		avionicsSuite: <Monitor className="h-4 w-4" />,
		autopilot: <Navigation className="h-4 w-4" />,
		gps: <Navigation className="h-4 w-4" />,
		radar: <Radar className="h-4 w-4" />,
		transponder: <Radio className="h-4 w-4" />,
		radio: <Radio className="h-4 w-4" />,
		com: <Radio className="h-4 w-4" />,
		nav: <Navigation className="h-4 w-4" />,
		adf: <Navigation className="h-4 w-4" />,
		vor: <Navigation className="h-4 w-4" />,
		ils: <Navigation className="h-4 w-4" />,
		weather: <Radar className="h-4 w-4" />,
		tcas: <Radar className="h-4 w-4" />,
		adsb: <Radio className="h-4 w-4" />,
		efis: <Monitor className="h-4 w-4" />,
		pfd: <Monitor className="h-4 w-4" />,
		mfd: <Monitor className="h-4 w-4" />,
		audio: <Headphones className="h-4 w-4" />,
		intercom: <Headphones className="h-4 w-4" />,
		bluetooth: <Bluetooth className="h-4 w-4" />,
		wifi: <Wifi className="h-4 w-4" />,
		power: <Power className="h-4 w-4" />,
		battery: <Battery className="h-4 w-4" />,

		// Market
		marketStatus: <TrendingUp className="h-4 w-4" />,
		exclusive: <Star className="h-4 w-4" />,
		leased: <Shield className="h-4 w-4" />,

		// Contact & Ownership
		contactName: <Users className="h-4 w-4" />,
		contactPhone: <Phone className="h-4 w-4" />,
		contactEmail: <Mail className="h-4 w-4" />,
		contactWebsite: <Globe className="h-4 w-4" />,

		// Owner Information
		owrcompanyname: <Shield className="h-4 w-4" />,
		owrcontactid: <Users className="h-4 w-4" />,
		owrcompid: <Shield className="h-4 w-4" />,
		owraddress1: <MapPin className="h-4 w-4" />,
		owraddress2: <MapPin className="h-4 w-4" />,
		owrcity: <MapPin className="h-4 w-4" />,
		owrstate: <MapPin className="h-4 w-4" />,
		owrzip: <MapPin className="h-4 w-4" />,
		owrcountry: <MapPin className="h-4 w-4" />,
		owrphone1: <Phone className="h-4 w-4" />,
		owrphone2: <Phone className="h-4 w-4" />,
		owrfname: <Users className="h-4 w-4" />,
		owrmiddle: <Users className="h-4 w-4" />,
		owrlname: <Users className="h-4 w-4" />,
		owremail: <Mail className="h-4 w-4" />,

		// Operator Information
		oprcompanyname: <Activity className="h-4 w-4" />,
		oprcontactid: <Users className="h-4 w-4" />,
		oprcompid: <Activity className="h-4 w-4" />,
		opraddress1: <MapPin className="h-4 w-4" />,
		opraddress2: <MapPin className="h-4 w-4" />,
		oprcity: <MapPin className="h-4 w-4" />,
		oprstate: <MapPin className="h-4 w-4" />,
		oprzip: <MapPin className="h-4 w-4" />,
		oprcountry: <MapPin className="h-4 w-4" />,
		oprphone1: <Phone className="h-4 w-4" />,
		oprphone2: <Phone className="h-4 w-4" />,
		oprfname: <Users className="h-4 w-4" />,
		oprmiddle: <Users className="h-4 w-4" />,
		oprlname: <Users className="h-4 w-4" />,
		opremail: <Mail className="h-4 w-4" />,

		// Broker Information
		excbrk1companyname: <Star className="h-4 w-4" />,
		excbrk1contactid: <Users className="h-4 w-4" />,
		excbrk1compid: <Star className="h-4 w-4" />,
		excbrk1address1: <MapPin className="h-4 w-4" />,
		excbrk1address2: <MapPin className="h-4 w-4" />,
		excbrk1city: <MapPin className="h-4 w-4" />,
		excbrk1state: <MapPin className="h-4 w-4" />,
		excbrk1zip: <MapPin className="h-4 w-4" />,
		excbrk1country: <MapPin className="h-4 w-4" />,
		excbrk1phone1: <Phone className="h-4 w-4" />,
		excbrk1phone2: <Phone className="h-4 w-4" />,
		excbrk1fname: <Users className="h-4 w-4" />,
		excbrk1middle: <Users className="h-4 w-4" />,
		excbrk1lname: <Users className="h-4 w-4" />,
		excbrk1title: <Users className="h-4 w-4" />,
		excbrk1email: <Mail className="h-4 w-4" />,

		// Additional Contacts
		addl1companyname: <Users className="h-4 w-4" />,
		addl1contactid: <Users className="h-4 w-4" />,
		addl1compid: <Users className="h-4 w-4" />,
		addl1address1: <MapPin className="h-4 w-4" />,
		addl1city: <MapPin className="h-4 w-4" />,
		addl1state: <MapPin className="h-4 w-4" />,
		addl1zip: <MapPin className="h-4 w-4" />,
		addl1country: <MapPin className="h-4 w-4" />,
		addl1phone1: <Phone className="h-4 w-4" />,
		addl1fname: <Users className="h-4 w-4" />,
		addl1lname: <Users className="h-4 w-4" />,
		addl1email: <Mail className="h-4 w-4" />,

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
	const [showRawData, setShowRawData] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
	// Handle case where data might be a string or other non-object type
	let allEntries: [string, unknown][] = [];

	if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
		allEntries = Object.entries(data);
	} else if (typeof data === 'string') {
		// If data is a string, treat it as a single field
		allEntries = [['data', data]];
	} else if (Array.isArray(data)) {
		// If data is an array, treat it as a single field
		allEntries = [['data', data]];
	} else {
		// For other types, treat as single field
		allEntries = [['data', data]];
	}

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
							{!showRawData && (
								<div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
									<Button
										variant={viewMode === 'grid' ? 'default' : 'ghost'}
										size="sm"
										onClick={() => setViewMode('grid')}
										className="h-7 px-2 text-xs"
									>
										<Grid3X3 className="h-3 w-3" />
									</Button>
									<Button
										variant={viewMode === 'table' ? 'default' : 'ghost'}
										size="sm"
										onClick={() => setViewMode('table')}
										className="h-7 px-2 text-xs"
									>
										<Table className="h-3 w-3" />
									</Button>
								</div>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowRawData(!showRawData)}
								className="h-8 px-2 text-xs"
							>
								{showRawData ? <Eye className="h-3 w-3 mr-1" /> : <Code className="h-3 w-3 mr-1" />}
								{showRawData ? 'Formatted' : 'Raw JSON'}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const csvData = populatedEntries.map(([key, value]) => ({
										Field: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
										Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
										Type: typeof value,
									}));
									const csv = [
										'Field,Value,Type',
										...csvData.map(row => `"${row.Field}","${row.Value}","${row.Type}"`),
									].join('\n');
									const blob = new Blob([csv], { type: 'text/csv' });
									const url = URL.createObjectURL(blob);
									const a = document.createElement('a');
									a.href = url;
									a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.csv`;
									a.click();
									URL.revokeObjectURL(url);
								}}
								className="h-8 px-2 text-xs"
							>
								<Download className="h-3 w-3 mr-1" />
								Export
							</Button>
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
					{/* Raw JSON View */}
					{showRawData && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-foreground">Raw JSON Data</h3>
								<Button
									variant="outline"
									size="sm"
									onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
									className="h-8 px-2 text-xs"
								>
									Copy JSON
								</Button>
							</div>
							<pre className="bg-muted/30 rounded-lg p-4 text-xs overflow-auto max-h-96 border border-border/30">
								<code className="text-foreground">{JSON.stringify(data, null, 2)}</code>
							</pre>
						</div>
					)}

					{/* Populated Fields - Grid or Table Layout */}
					{!showRawData && populatedEntries.length > 0 && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-foreground">Populated Fields</h3>
								<Badge variant="secondary" className="text-xs">
									{populatedEntries.length} fields
								</Badge>
							</div>

							{viewMode === 'grid' ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{populatedEntries.map(([key, value], index) => (
										<motion.div
											key={key}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.02 }}
											className="group cursor-pointer hover:bg-muted/20 rounded-lg p-3 transition-all duration-200 border border-border/30 hover:border-border/60"
											onClick={() => {
												const textToCopy = `${key}: ${
													typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
												}`;
												navigator.clipboard.writeText(textToCopy);
											}}
										>
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
													{getIconForField(key)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium text-foreground mb-1">
														{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
													</div>
													<div className="text-sm text-muted-foreground">{renderValue(value)}</div>
												</div>
											</div>
										</motion.div>
									))}
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full border-collapse">
										<thead>
											<tr className="border-b border-border/30">
												<th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
													Field
												</th>
												<th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
													Value
												</th>
												<th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
													Type
												</th>
											</tr>
										</thead>
										<tbody>
											{populatedEntries.map(([key, value], index) => (
												<motion.tr
													key={key}
													initial={{ opacity: 0, x: -10 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: index * 0.01 }}
													className="border-b border-border/20 hover:bg-muted/10 transition-colors cursor-pointer"
													onClick={() => {
														const textToCopy = `${key}: ${
															typeof value === 'object'
																? JSON.stringify(value, null, 2)
																: String(value)
														}`;
														navigator.clipboard.writeText(textToCopy);
													}}
												>
													<td className="py-3 px-4">
														<div className="flex items-center gap-2">
															<div className="p-1 rounded bg-primary/10 text-primary">
																{getIconForField(key)}
															</div>
															<span className="text-sm font-medium text-foreground">
																{key
																	.replace(/([A-Z])/g, ' $1')
																	.replace(/^./, str => str.toUpperCase())}
															</span>
														</div>
													</td>
													<td className="py-3 px-4 max-w-md">
														<div className="text-sm text-muted-foreground">
															{renderValue(value)}
														</div>
													</td>
													<td className="py-3 px-4">
														<Badge variant="outline" className="text-xs">
															{typeof value}
														</Badge>
													</td>
												</motion.tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{/* Empty Fields */}
					{!showRawData && emptyEntries.length > 0 && (
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
					{!showRawData && (
						<div className="pt-4 border-t border-border/50">
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<span>Click populated fields to copy to clipboard</span>
								<span className="flex items-center gap-2">
									<Info className="h-3 w-3" />
									{allEntries.length} total fields
								</span>
							</div>
						</div>
					)}
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

export function OwnerFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Owner Information" icon={<Shield className="h-5 w-5" />} />
	);
}

export function OperatorFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter
			data={data}
			title="Operator Information"
			icon={<Activity className="h-5 w-5" />}
		/>
	);
}

export function BrokerFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Broker Information" icon={<Star className="h-5 w-5" />} />
	);
}

export function RawDataFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Raw JetNet Data" icon={<FileText className="h-5 w-5" />} />
	);
}

export function AvionicsFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter
			data={data}
			title="Avionics & Electronics"
			icon={<Radio className="h-5 w-5" />}
		/>
	);
}

export function ImagesFormatter({ data }: { data: Record<string, unknown> }) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<DataFormatter data={data} title="Aircraft Images" icon={<Camera className="h-5 w-5" />} />
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
		{ key: 'images', title: 'Aircraft Images', icon: <Camera className="h-5 w-5" /> },
		{ key: 'photos', title: 'Photo Gallery', icon: <Camera className="h-5 w-5" /> },
		{
			key: 'avionicsSuite',
			title: 'Avionics & Electronics',
			icon: <Monitor className="h-5 w-5" />,
		},
		{ key: 'autopilot', title: 'Autopilot System', icon: <Navigation className="h-5 w-5" /> },
		{ key: 'gps', title: 'GPS Navigation', icon: <Navigation className="h-5 w-5" /> },
		{ key: 'radar', title: 'Radar Systems', icon: <Radar className="h-5 w-5" /> },
		{ key: 'audio', title: 'Audio Systems', icon: <Headphones className="h-5 w-5" /> },
		{ key: 'power', title: 'Power Systems', icon: <Power className="h-5 w-5" /> },
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
