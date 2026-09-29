import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FileUpload } from '@/components/ui/file-upload';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DesignSystemPreview() {
  const [date, setDate] = useState<Date>();
  const { toast } = useToast();

  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto pb-32">
      <div>
        <h1 className="text-3xl font-bold mb-2">Design System CentroAbsen</h1>
        <p className="text-muted-foreground">Preview dari komponen-komponen utama UI.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Colors & Typography</h2>
        <div className="flex gap-4">
          <div className="w-24 h-24 bg-primary text-primary-foreground flex items-center justify-center rounded-lg shadow-sm">Primary</div>
          <div className="w-24 h-24 bg-success text-success-foreground flex items-center justify-center rounded-lg shadow-sm">Success</div>
          <div className="w-24 h-24 bg-warning text-warning-foreground flex items-center justify-center rounded-lg shadow-sm">Warning</div>
          <div className="w-24 h-24 bg-destructive text-destructive-foreground flex items-center justify-center rounded-lg shadow-sm">Error</div>
          <div className="w-24 h-24 bg-muted text-muted-foreground flex items-center justify-center rounded-lg shadow-sm">Muted</div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Inputs & Forms</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Text Input</label>
            <Input placeholder="Type something..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Field</label>
            <SearchField placeholder="Search..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Option 1</SelectItem>
                <SelectItem value="2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Date Picker</label>
            <DatePicker date={date} setDate={setDate} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Badges</h2>
        <div className="flex gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Tabs / Segmented Control</h2>
        <Tabs defaultValue="account" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account">Account settings content.</TabsContent>
          <TabsContent value="password">Password settings content.</TabsContent>
        </Tabs>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">States (Empty, Error, Loading)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <EmptyState icon={Inbox} title="Belum Ada Data" description="Data akan muncul di sini saat Anda membuat pengajuan baru." />
          </div>
          <div className="border rounded-lg p-4">
            <ErrorState description="Gagal memuat data dari server. Silakan coba beberapa saat lagi." onRetry={() => {}} />
          </div>
          <div className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">File Upload</h2>
        <FileUpload maxSizeMB={2} maxFiles={3} accept="image/*,.pdf" multiple />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Timeline</h2>
        <Timeline>
          <TimelineItem icon={<CheckCircle className="h-4 w-4" />} title="Pengajuan Dibuat" description="Oleh Budi Santoso" date="12 Okt 2026, 09:00 WIB" isActive />
          <TimelineItem icon={<Clock className="h-4 w-4" />} title="Menunggu Persetujuan HR" description="Menunggu review dari HR" />
        </Timeline>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Toast Notifications</h2>
        <Button onClick={() => toast({ title: "Berhasil!", description: "Aksi telah berhasil dilakukan." })}>Show Toast</Button>
      </section>
    </div>
  );
}
