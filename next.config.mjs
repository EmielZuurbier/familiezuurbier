import { withPayload } from '@payloadcms/next/withPayload'
export default withPayload({
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
    ]
  },
})
