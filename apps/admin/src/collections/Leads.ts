import type { CollectionConfig } from 'payload'
import { randomUUID } from 'node:crypto'

import { allowFieldRoles, ownerOrAdmin, salesTeam } from '../access/roles'

const deliveryOptions = [
  { label: 'Not configured', value: 'not_configured' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
]
const immutable = () => false
const forensicRead = allowFieldRoles('owner', 'admin')

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { plural: 'Заявки', singular: 'Заявка' },
  access: { create: () => false, delete: ownerOrAdmin, read: salesTeam, update: salesTeam },
  admin: {
    defaultColumns: ['requestCode', 'name', 'company', 'status', 'deliveryStatus', 'createdAt'],
    group: 'Продажи',
    useAsTitle: 'requestCode',
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation !== 'create' || !data) return data
        const submissionId = typeof data.submissionId === 'string' && data.submissionId ? data.submissionId : randomUUID()
        return {
          ...data,
          submissionId,
          requestCode: typeof data.requestCode === 'string' && data.requestCode
            ? data.requestCode
            : `ITW-${new Date().getUTCFullYear()}-${submissionId.slice(0, 8).toUpperCase()}`,
        }
      },
    ],
  },
  fields: [
    { name: 'submissionId', type: 'text', required: true, unique: true, index: true, admin: { hidden: true }, access: { update: immutable } },
    { name: 'requestCode', type: 'text', required: true, index: true, label: 'Код заявки', access: { update: immutable } },
    { name: 'name', type: 'text', required: true, label: 'Имя' },
    { name: 'company', type: 'text', label: 'Компания' },
    { name: 'contact', type: 'text', required: true, label: 'Контакт' },
    { name: 'email', type: 'email', admin: { hidden: true } },
    { name: 'phone', type: 'text', admin: { hidden: true } },
    { name: 'topic', type: 'text', admin: { hidden: true } },
    { name: 'message', type: 'textarea', admin: { hidden: true } },
    { name: 'task', type: 'textarea', required: true, label: 'Задача' },
    { name: 'systems', type: 'text', label: 'Текущие системы' },
    { name: 'site', type: 'text', label: 'Сайт' },
    { name: 'topics', type: 'text', hasMany: true, label: 'Темы' },
    { name: 'diagnosis', type: 'textarea', label: 'Диагностика' },
    {
      name: 'status', type: 'select', defaultValue: 'new', label: 'Статус работы', required: true,
      options: [
        { label: 'Новая', value: 'new' }, { label: 'В работе', value: 'in_progress' },
        { label: 'Квалифицирована', value: 'qualified' }, { label: 'Закрыта', value: 'closed' },
        { label: 'Отклонена', value: 'rejected' }, { label: 'Спам', value: 'spam' },
      ],
    },
    { name: 'source', type: 'text', defaultValue: 'website', label: 'Источник' },
    { name: 'originService', type: 'text', label: 'Направление' },
    { name: 'originScenario', type: 'text', label: 'Сценарий' },
    { name: 'pageURL', type: 'text', label: 'Страница отправки', access: { update: immutable } },
    { name: 'landingPath', type: 'text', label: 'Посадочная страница', access: { update: immutable } },
    { name: 'referrer', type: 'text', label: 'Referrer', access: { update: immutable } },
    { name: 'utm', type: 'json', label: 'UTM', access: { update: immutable } },
    { name: 'attachment', type: 'upload', relationTo: 'lead-files', label: 'Вложение', access: { update: immutable } },
    { name: 'consentAccepted', type: 'checkbox', required: true, label: 'Согласие получено', access: { update: immutable } },
    { name: 'consentAcceptedAt', type: 'date', label: 'Дата согласия', access: { update: immutable } },
    { name: 'consentVersion', type: 'text', label: 'Версия согласия', access: { update: immutable } },
    { name: 'privacyVersion', type: 'text', label: 'Версия политики', access: { update: immutable } },
    { name: 'sessionId', type: 'text', admin: { hidden: true }, access: { read: forensicRead, update: immutable } },
    { name: 'ipHash', type: 'text', admin: { hidden: true }, access: { read: forensicRead, update: immutable } },
    { name: 'userAgent', type: 'text', admin: { hidden: true }, access: { read: forensicRead, update: immutable } },
    {
      name: 'deliveryStatus', type: 'select', defaultValue: 'queued', label: 'Доставка', required: true, access: { update: immutable },
      options: [
        { label: 'В очереди', value: 'queued' }, { label: 'Выполняется', value: 'processing' },
        { label: 'Повтор', value: 'retrying' }, { label: 'Доставлена', value: 'delivered' },
        { label: 'Частично', value: 'partial' }, { label: 'Требует внимания', value: 'dead_letter' },
      ],
    },
    { name: 'bitrixStatus', type: 'select', defaultValue: 'pending', options: deliveryOptions, label: 'Bitrix24', access: { update: immutable } },
    { name: 'telegramStatus', type: 'select', defaultValue: 'pending', options: deliveryOptions, label: 'Telegram', access: { update: immutable } },
    { name: 'bitrixLeadId', type: 'text', label: 'ID лида Bitrix24', admin: { readOnly: true }, access: { update: immutable } },
    { name: 'telegramMessageId', type: 'text', admin: { hidden: true }, access: { update: immutable } },
    { name: 'telegramAttachmentDelivered', type: 'checkbox', defaultValue: false, admin: { hidden: true }, access: { update: immutable } },
    { name: 'deliveryAttempts', type: 'number', defaultValue: 0, label: 'Попытки', admin: { readOnly: true }, access: { update: immutable } },
    { name: 'lastDeliveryError', type: 'text', label: 'Последняя ошибка', admin: { readOnly: true }, access: { update: immutable } },
    { name: 'deliveredAt', type: 'date', label: 'Доставлена', admin: { readOnly: true }, access: { update: immutable } },
  ],
}
