'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { RecipientInput } from './RecipientInput';
import { FileUploader } from './FileUploader';
import { RichTextEditor } from './RichTextEditor';
import { SchedulePicker } from './SchedulePicker';
import { useSenders } from '@/hooks/useSenders';
import { useScheduleEmails } from '@/hooks/useEmails';

export function ComposeForm() {
  const router = useRouter();
  const { data: senders = [] } = useSenders();
  const scheduleMutation = useScheduleEmails();

  const [senderId, setSenderId] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<{ fileName: string; count: number } | null>(null);


  const handleSend = (scheduledAt?: Date) => {
    const selectedSenderId = senderId || senders[0]?.id;
    if (!selectedSenderId) return toast.error('Add a sender before scheduling emails.');
    if (!recipients.length) return toast.error('Add at least one valid recipient.');
    if (!subject.trim()) return toast.error('Enter an email subject.');
    if (!body.trim()) return toast.error('Enter an email body.');
    if (hourlyLimit < 1) return toast.error('Hourly limit must be at least 1.');
    if (delayBetweenEmails < 0) return toast.error('Delay cannot be negative.');
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) return toast.error('Choose a future schedule time.');
    scheduleMutation.mutate({
      senderId: selectedSenderId,
      recipients,
      subject,
      body,
      delayBetweenEmails,
      hourlyLimit,
      startTime: scheduledAt?.toISOString() || new Date().toISOString()
    }, {
      onSuccess: () => router.push('/dashboard/scheduled')
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-3">
          <Dropdown
            align="right"
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            closeOnContentClick={false}
            trigger={
              <Button variant="outline" className="rounded-full gap-2">
                <Clock className="w-4 h-4" />
                Send Later
              </Button>
            }
          >
            <SchedulePicker
              onSelect={(date) => {
                setScheduleOpen(false);
                handleSend(date);
              }}
              onCancel={() => setScheduleOpen(false)}
            />
          </Dropdown>

          <Button
            onClick={() => handleSend()}
            isLoading={scheduleMutation.isPending}
            className="rounded-full"
          >
            Send Now
          </Button>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <label className="w-[100px] text-right text-sm font-medium text-gray-600">From:</label>
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="flex-1 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {senders.map(s => (
              <option key={s.id} value={s.id}>{s.email} ({s.name})</option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-[100px] text-right mt-2">
            <label className="text-sm font-medium text-gray-600">To:</label>
            {recipients.length > 0 && (
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {recipients.length} total
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex gap-2">
              <div className="flex-1">
                <RecipientInput emails={recipients} onChange={setRecipients} />
              </div>
              <div className="shrink-0 pt-2">
                <FileUploader
                  onEmailsExtracted={(emails) => setRecipients((prev) => Array.from(new Set([...prev, ...emails])))}
                  onFileProcessed={setLastUploadedFile}
                />
              </div>
            </div>
            {lastUploadedFile && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Parsed <span className="font-medium text-gray-700">{lastUploadedFile.fileName}</span>: {lastUploadedFile.count} email addresses detected
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="w-[100px] text-right text-sm font-medium text-gray-600">Subject:</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1"
            placeholder="Email Subject"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="w-[100px] text-right text-sm font-medium text-gray-600 whitespace-nowrap">Settings:</label>
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Delay between emails (ms):</span>
              <Input
                type="number"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                placeholder="00"
                className="w-20 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hourly Limit:</span>
              <Input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, Number(e.target.value)))}
                placeholder="00"
                className="w-20 text-center"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 mt-4 ml-[116px]">
          <RichTextEditor value={body} onChange={setBody} />
        </div>
      </div>
    </div>
  );
}
