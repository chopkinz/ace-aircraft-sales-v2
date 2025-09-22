/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ['@prisma/client'],
	outputFileTracingRoot: undefined,
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'storage.googleapis.com',
				port: '',
				pathname: '/**',
			},
		],
	},
};

module.exports = nextConfig;
