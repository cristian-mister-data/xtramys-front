import styled from 'styled-components';
import TacticalBoard from '@/features/tacticalBoard/TacticalBoard';
import RotatePrompt from '@/features/tacticalBoard/RotatePrompt';

const MobileSafeWrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  @media (max-width: 900px) {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    min-height: -webkit-fill-available;
  }
`;

export default function TacticalBoardPage() {
  return (
    <MobileSafeWrap>
      <RotatePrompt />
      <TacticalBoard />
    </MobileSafeWrap>
  );
}