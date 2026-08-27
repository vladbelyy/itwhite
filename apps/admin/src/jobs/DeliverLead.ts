import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { TaskConfig } from 'payload'

const providerJSON = async (url: string, init: RequestInit) => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  const payload = await response.json().catch(() => ({})) as { error?: string; result?: unknown }
  if (!response.ok || payload.error) throw new Error('provider_rejected')
  return payload.result
}

const bitrixMethodURL = (webhook: string, method: string) => {
  const url = new URL(webhook)
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 3) throw new Error('bitrix_url_invalid')
  segments[segments.length - 1] = `${method}.json`
  url.pathname = `/${segments.join('/')}`
  url.search = ''
  return url.toString()
}

const comments = (lead: Record<string, unknown>) => [
  `Код: ${lead.requestCode || '-'}`,
  `Контакт: ${lead.contact || '-'}`,
  `Сайт: ${lead.site || '-'}`,
  `Системы: ${lead.systems || '-'}`,
  `Темы: ${Array.isArray(lead.topics) ? lead.topics.join(', ') : '-'}`,
  `Задача: ${lead.task || '-'}`,
  `Диагностика: ${lead.diagnosis || '-'}`,
  `Направление: ${lead.originService || '-'}`,
  `Сценарий: ${lead.originScenario || '-'}`,
  `UTM: ${JSON.stringify(lead.utm || {})}`,
  `Referrer: ${lead.referrer || '-'}`,
  `Page: ${lead.pageURL || '-'}`,
  `Attachment: ${lead.attachment ? 'есть' : 'нет'}`,
  `Согласие: ${lead.consentVersion || '-'} / ${lead.consentAcceptedAt || '-'}`,
  `Политика: ${lead.privacyVersion || '-'}`,
].join('\n')

const deliverBitrix = async (lead: Record<string, unknown>) => {
  const webhook = process.env.BITRIX24_WEBHOOK_URL
  if (!webhook) return null
  const originId = String(lead.submissionId)
  const listResult = await providerJSON(bitrixMethodURL(webhook, 'crm.lead.list'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filter: { ORIGINATOR_ID: 'ITWHITE_SITE', ORIGIN_ID: originId }, select: ['ID'], start: 0 }),
  })
  const existing = Array.isArray(listResult) ? listResult[0] as { ID?: string | number } | undefined : undefined
  if (existing?.ID) return String(existing.ID)
  const result = await providerJSON(bitrixMethodURL(webhook, 'crm.lead.add'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: {
        TITLE: `IT WHITE ${lead.requestCode || 'REQUEST'}: ${lead.name || ''}`,
        NAME: lead.name,
        COMPANY_TITLE: lead.company,
        COMMENTS: comments(lead),
        ORIGINATOR_ID: 'ITWHITE_SITE',
        ORIGIN_ID: originId,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    }),
  })
  if (typeof result !== 'number' && typeof result !== 'string') throw new Error('bitrix_result_invalid')
  return String(result)
}

const telegramText = (lead: Record<string, unknown>) => [
  `Новая заявка IT WHITE / ${lead.requestCode || 'без кода'}`,
  `ID: ${lead.submissionId}`,
  `Имя: ${lead.name || '-'}`,
  `Компания: ${lead.company || '-'}`,
  `Контакт: ${lead.contact || '-'}`,
  `Сайт: ${lead.site || '-'}`,
  `Системы: ${lead.systems || '-'}`,
  `Темы: ${Array.isArray(lead.topics) ? lead.topics.join(', ') : '-'}`,
  `Задача: ${lead.task || '-'}`,
  `Направление: ${lead.originService || '-'}`,
  `Страница: ${lead.pageURL || '-'}`,
  `Файл: ${lead.attachment ? (process.env.LEAD_ATTACHMENT_DELIVERY_ENABLED === 'true' ? 'будет отправлен отдельным сообщением' : 'сохранён в защищённой админке, автопересылка отключена') : 'нет'}`,
].join('\n').slice(0, 4096)

const sendTelegramMessage = async (lead: Record<string, unknown>) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  const result = await providerJSON(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: telegramText(lead) }),
  }) as { message_id?: string | number } | undefined
  if (!result?.message_id) throw new Error('telegram_result_invalid')
  return String(result.message_id)
}

const sendTelegramAttachment = async (leadFile: Record<string, unknown>, requestCode: unknown) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const filename = typeof leadFile.filename === 'string' ? path.basename(leadFile.filename) : ''
  if (!token || !chatId || !filename) throw new Error('attachment_unavailable')
  const directory = path.resolve(process.env.LEAD_FILES_DIR || './lead-files')
  const filePath = path.resolve(directory, filename)
  if (!filePath.startsWith(`${directory}${path.sep}`)) throw new Error('attachment_path_invalid')
  const data = await readFile(filePath)
  const body = new FormData()
  body.set('chat_id', chatId)
  body.set('caption', `Файл к заявке ${String(requestCode || '')}`)
  body.set('document', new Blob([data], { type: String(leadFile.mimeType || 'application/octet-stream') }), String(leadFile.originalName || filename))
  await providerJSON(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body })
}

export const DeliverLead = {
  slug: 'deliverLead',
  label: 'Доставка заявки',
  retries: 5,
  inputSchema: [{ name: 'leadId', type: 'number', required: true }],
  outputSchema: [{ name: 'delivered', type: 'checkbox', required: true }],
  handler: async ({ input, req }) => {
    const { leadId } = input as { leadId: number }
    const lead = await req.payload.findByID({ collection: 'leads', id: leadId, depth: 0, overrideAccess: true })
    const attempt = Number(lead.deliveryAttempts || 0) + 1
    await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { deliveryAttempts: attempt, deliveryStatus: 'processing', lastDeliveryError: '' } })
    const failed: string[] = []

    if (process.env.BITRIX24_WEBHOOK_URL && lead.bitrixStatus !== 'delivered') {
      try {
        const bitrixLeadId = await deliverBitrix(lead as unknown as Record<string, unknown>)
        await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { bitrixLeadId, bitrixStatus: 'delivered' } })
      } catch { failed.push('Bitrix24') }
    }

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && lead.telegramStatus !== 'delivered') {
      try {
        let telegramMessageId = lead.telegramMessageId
        if (!telegramMessageId) {
          telegramMessageId = await sendTelegramMessage(lead as unknown as Record<string, unknown>)
          await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { telegramMessageId } })
        }
        if (lead.attachment && !lead.telegramAttachmentDelivered && process.env.LEAD_ATTACHMENT_DELIVERY_ENABLED === 'true') {
          const fileId = typeof lead.attachment === 'object' ? lead.attachment.id : lead.attachment
          const leadFile = await req.payload.findByID({ collection: 'lead-files', id: fileId, depth: 0, overrideAccess: true })
          await sendTelegramAttachment(leadFile as unknown as Record<string, unknown>, lead.requestCode)
          await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { telegramAttachmentDelivered: true } })
        }
        await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { telegramStatus: 'delivered' } })
      } catch { failed.push('Telegram') }
    }

    const configured = [Boolean(process.env.BITRIX24_WEBHOOK_URL), Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)].filter(Boolean).length
    const refreshed = await req.payload.findByID({ collection: 'leads', id: lead.id, depth: 0, overrideAccess: true })
    const delivered = [refreshed.bitrixStatus, refreshed.telegramStatus].filter((status) => status === 'delivered').length
    if (!configured) failed.push('Канал доставки')
    if (failed.length) {
      const terminal = attempt >= 6
      await req.payload.update({
        collection: 'leads', id: lead.id, overrideAccess: true,
        data: {
          bitrixStatus: failed.includes('Bitrix24') ? 'failed' : refreshed.bitrixStatus,
          telegramStatus: failed.includes('Telegram') ? 'failed' : refreshed.telegramStatus,
          deliveryStatus: terminal ? 'dead_letter' : delivered > 0 ? 'partial' : 'retrying',
          lastDeliveryError: `${failed.join(', ')}: доставка не подтверждена`,
        },
      })
      throw new Error('lead_delivery_failed')
    }
    await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { deliveryStatus: 'delivered', deliveredAt: new Date().toISOString(), lastDeliveryError: '' } })
    return { output: { delivered: true } }
  },
} satisfies TaskConfig
