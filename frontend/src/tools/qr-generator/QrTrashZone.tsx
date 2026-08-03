// 드래그 중에만 나타나는 삭제 영역 — 격자 위에 떠 있는 오버레이(레이아웃을 밀지 않음).
// 제도 도면 어휘를 그대로 쓴다: 평소엔 점선 브래킷(예정된 영역), 조준되면 45° 해칭으로
// 채워진다 — 도면에서 해칭은 "제거될 재료"를 뜻한다.
import { Trash2 } from 'lucide-react'
import type { Ref } from 'react'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'

interface QrTrashZoneProps {
  ref: Ref<HTMLDivElement>
  armed: boolean // 포인터가 영역 안에 들어옴 = 놓으면 삭제
  idleLabel: string
  armedLabel: string
}

export function QrTrashZone({ ref, armed, idleLabel, armedLabel }: QrTrashZoneProps) {
  return (
    <Blueprint
      ref={ref}
      className={armed ? 'wb-qr-trash is-armed' : 'wb-qr-trash'}
      // 포인터 드래그 전용 어포던스 — 스크린리더에는 숨긴다.
      // (조준 여부가 매 이동마다 바뀌어 live region으로 두면 낭독이 폭주하고,
      //  키보드 사용자는 카드의 × 버튼으로 이미 삭제할 수 있다.)
      aria-hidden={true}
    >
      <span className="wb-qr-trash-icon">
        <Icon icon={Trash2} size={20} />
      </span>
      <span className="wb-qr-trash-label">{armed ? armedLabel : idleLabel}</span>
    </Blueprint>
  )
}
