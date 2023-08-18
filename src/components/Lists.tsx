import { useRef, useState } from 'react'
import {
  Card,
  LegacyCard,
  LegacyStack,
  Text,
  SkeletonBodyText,
  SkeletonDisplayText,
  Tooltip,
} from '@shopify/polaris'
import {
  donutDataKeys,
  donutDataObject,
  donutDataLineItemData,
} from '../types/Types'
import { useAuthDispatch } from '../contexts/Auth'
import { useToastDispatch } from '../contexts/Toast'
import { DataExport } from '../DataExport'
import { DonutPieChart } from './Charts'

const DataCard: React.FC<any> = ({ data, placeholder }) => {
  return placeholder ? (
    <Card>
      <Text variant="headingXl" as="h3">
        <SkeletonDisplayText />
      </Text>
      <br />
      <Text variant="bodySm" as="p">
        <SkeletonBodyText lines={1} />
      </Text>
    </Card>
  ) : (
    <Card key={data.id}>
      <Text variant="headingXl" as="h3">
        {data.id}
      </Text>
      <Text variant="bodyLg" as="p">
        {data.attributes.name}
      </Text>
      <Text variant="bodySm" as="p">
        {data.attributes.updated}
      </Text>
    </Card>
  )
}

export const Lists: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([] as any)

  const [donutData, setDonutData] = useState({} as donutDataObject)

  const authDispatch = useAuthDispatch()
  const toastDispatch = useToastDispatch()

  const fetchData = async (): Promise<void> => {
    setLoading(true)

    const lists = await fetch('/get-lists', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json())

    if (lists.errors?.length > 0 && lists.code !== 401) {
      authDispatch!({ type: 'error', message: lists.message })
      toastDispatch!({ type: 'error', message: lists.message })
    } else if (lists.errors?.length > 0 && lists.code !== 200) {
      authDispatch!({ type: 'expired', message: lists.message })
      toastDispatch!({ type: 'error', message: lists.message })
    } else {
      authDispatch!({ type: 'success' })
      setData(lists)
      setDonutData(formatDonutData(lists))
    }

    setLoading(false)
  }

  const initialized = useRef(false)
  if (!initialized.current) {
    fetchData()
    initialized.current = true
  }

  const formatSourceString = (string: string) => {
    return string
      .replace(/,/g, '\n')
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace('fb', 'FB')
      .replace('tw', 'TW')
      .trim()
  }

  const formatDonutData = (data: any) => {
    const rawData: donutDataObject = {
      name: { name: 'List Name', data: [] },
      // name: { name: 'Name', data: [] },
    }

    data.map((d: any) => {
      return Object.keys(rawData).map((key: string) => {
        let source = d?.attributes[key as keyof any]
        let sourceString = ''

        if (source) sourceString = source?.toString() ?? ''

        const currentVal = rawData[key as donutDataKeys]?.data.find(
          (o: donutDataLineItemData) => {
            return (
              o.name === sourceString ||
              o.name === formatSourceString(sourceString)
            )
          }
        )

        if (sourceString !== '') {
          let k = rawData[key as donutDataKeys]?.name

          if (!currentVal && k) {
            rawData[key as donutDataKeys]?.data.push({
              data: [
                {
                  key: k,
                  value: 1,
                },
              ],
              name: formatSourceString(sourceString),
            })
          } else if (currentVal) {
            // @ts-ignore
            currentVal.data[0].value += 1
          }
        }
      })
    })

    // sort
    Object.keys(rawData).map((key: string) => {
      rawData[key as donutDataKeys]?.data.sort((a, b) => {
        // @ts-ignore
        return b.data[0].value - a.data[0].value
      })
    })

    return rawData
  }

  return (
    <LegacyStack vertical>
      <LegacyStack>
        <LegacyStack.Item>
          <Text variant="bodyMd" as="p">
            Below will make a <code>GET</code> request to the API endpoint{' '}
            <code>https://a.klaviyo.com/api/lists</code>
          </Text>
        </LegacyStack.Item>
        <LegacyStack.Item>
          <Tooltip
            content="Download List Data as CSV"
            preferredPosition="above"
          >
            <DataExport
              data={data}
              title="Lists"
              disabled={Object.keys(data).length <= 0}
            />
          </Tooltip>
        </LegacyStack.Item>
      </LegacyStack>

      <div id="table-wrapper" style={{ opacity: loading ? '0.5' : '1' }}>
        <LegacyStack wrap={true} alignment="trailing">
          {donutData &&
            Object.keys(donutData).map((key) => (
              <LegacyStack.Item fill key={key}>
                <LegacyCard title={donutData[key as donutDataKeys]?.name}>
                  <DonutPieChart
                    data={donutData[key as donutDataKeys]?.data ?? []}
                  />
                </LegacyCard>
              </LegacyStack.Item>
            ))}
        </LegacyStack>
      </div>

      <LegacyStack distribution="fillEvenly">
        {loading
          ? [...Array(3).keys()].map((i) => (
              <DataCard key={i} placeholder={true} />
            ))
          : data.map((d: any, i) => <DataCard key={i} data={d} />)}
      </LegacyStack>
    </LegacyStack>
  )
}
