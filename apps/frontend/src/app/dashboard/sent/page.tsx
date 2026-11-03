'use client';

import React, { useState } from 'react';
import { useSentEmails, useSearchEmails } from '@/hooks/useEmails';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/email/SearchBar';
import { EmailList } from '@/components/email/EmailList';
import { Send } from 'lucide-react';

export default function SentPage() {
  const [search, setSearch] = useState('');

  const sentQuery = useSentEmails(1, 20);
  const searchQuery = useSearchEmails(search, 'sent');

  const { data, isLoading, error, refetch } = search.length > 0 ? searchQuery : sentQuery;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <Header title="Sent Emails">
        <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
          <Send className="w-4 h-4" />
          {data?.total || 0} Sent
        </div>
      </Header>

      <SearchBar onSearch={setSearch} onRefresh={refetch} />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={data?.data}
          isLoading={isLoading}
          error={error}
          emptyTitle="No sent emails"
          emptyDescription="Emails that have been successfully delivered will appear here."
        />
      </div>
    </div>
  );
}
