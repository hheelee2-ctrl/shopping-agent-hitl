/** 버튼·행 안에 들어가는 작은 진행 표시. 글자 색을 따른다. */
export function Spinner({ size = 12 }: { size?: number }) {
  return <span className="spin" style={{ width: size, height: size }} aria-hidden />;
}
