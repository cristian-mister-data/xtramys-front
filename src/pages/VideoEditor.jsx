import VideoRecorderPanel from '@/features/video/VideoRecorderPanel';
import { PageHeader, PageTitle } from '@/ui/primitives';

export default function VideoEditor() {
  return (
    <div>
      <PageHeader><PageTitle>Editor de vídeo</PageTitle></PageHeader>
      <VideoRecorderPanel />
    </div>
  );
}
