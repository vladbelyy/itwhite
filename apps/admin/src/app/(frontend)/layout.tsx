import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Private IT WHITE workspace',
  robots: { follow: false, index: false },
  title: 'IT WHITE Admin',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ru">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
