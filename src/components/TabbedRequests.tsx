import React, { Suspense } from 'react'
import {
  LegacyCard,
  Layout,
  Tabs,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris'
import { useEffect, useState, useCallback } from 'react'
import { useAuthDispatch } from '../contexts/Auth'

// code splitting
const Lists = React.lazy(
  async () => await import('./Lists').then((c) => ({ default: c.Lists }))
)
const Metrics = React.lazy(
  async () => await import('./Metrics').then((c) => ({ default: c.Metrics }))
)

const fallback = (
  <>
    <br />
    <SkeletonBodyText />
    <SkeletonBodyText lines={1} />
    <br />
    <SkeletonDisplayText />
  </>
)

export const TabbedRequests: React.FC<any> = () => {
  const [selected, setSelected] = useState(0)
  const authDispatch = useAuthDispatch()

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelected(selectedTabIndex)
    authDispatch!({ type: 'success' })
    const activeTabId = tabs[selectedTabIndex]?.id
    if (activeTabId) window.location.hash = activeTabId.toString()
  }, [])

  // quasi-router
  useEffect(() => {
    const windowHash = window.location.hash.replace('#', '')
    if (windowHash) {
      const activeTab = tabs?.findIndex((tab) => tab.id === windowHash)
      if (activeTab) setSelected(activeTab)
    }
  }, [])

  const tabs = [
    {
      id: 'lists',
      content: 'Lists',
      info: 'Lists',
      tabContent: <Lists />,
    },
    {
      id: 'metrics',
      content: 'Metrics',
      info: 'Metrics',
      tabContent: <Metrics />,
    },
  ] as any

  return (
    <Layout.Section>
      <LegacyCard>
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          <LegacyCard.Section title={tabs[selected].info}>
            <Suspense fallback={fallback}>
              {tabs[selected]?.tabContent}
            </Suspense>
          </LegacyCard.Section>
        </Tabs>
      </LegacyCard>
    </Layout.Section>
  )
}
