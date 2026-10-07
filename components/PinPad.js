// components/PinPad.js
import { Delete } from 'lucide-react';

export default function PinPad({ value, onChange, length = 6 }) {
  function press(digit) {
    if (value.length >= length) return;
    onChange(value + digit);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div>
      <div className="flex justify-center gap-3 mb-10">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 ${i < value.length ? 'bg-primary border-primary' : 'border-border'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
        {keys.map((k, i) => {
          if (k === '') return <div key={i} />;
          if (k === 'del') {
            return (
              <button key={i} onClick={backspace} className="h-16 flex items-center justify-center rounded-full hover:bg-card-hover transition-colors">
                <Delete size={22} className="text-muted" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => press(k)}
              className="h-16 rounded-full text-xl font-semibold hover:bg-card-hover active:scale-95 transition-all"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  )
;
}
