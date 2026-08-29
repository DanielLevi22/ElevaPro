import { fireEvent, render, screen } from '@testing-library/react-native';
import { AnamnesisQuestion } from '../../types/assessment';
import { QuestionInput } from '../QuestionInput';

const altura: AnamnesisQuestion = { id: 'height', text: 'Altura (cm)', type: 'number' };

describe('QuestionInput — pergunta numérica', () => {
  // A pergunta já declara o tipo, e o web honra a declaração: converte antes de
  // gravar. Aqui o ramo numérico dividia o campo com o de texto e devolvia a
  // string crua, então a mesma anamnese virava número no web e texto no
  // celular. O teclado numérico é dica, não restrição — não conserta isso.
  it('devolve número, não o texto cru do campo', () => {
    const onChange = jest.fn();
    render(<QuestionInput question={altura} value={undefined} onChange={onChange} />);

    fireEvent.changeText(screen.getByPlaceholderText('Digite sua resposta...'), '175');

    expect(onChange).toHaveBeenCalledWith(175);
  });
});

describe('QuestionInput — a vírgula durante a digitação', () => {
  // O teclado numérico do Android oferece vírgula, e o aluno digita "1,75" em
  // três toques. No toque do meio o campo vale "1," — se isso virar NaN, a
  // resposta some do store no meio da digitação e o campo pisca vazio.
  it('não manda NaN enquanto a vírgula está sendo digitada', () => {
    const onChange = jest.fn();
    render(<QuestionInput question={altura} value={undefined} onChange={onChange} />);

    fireEvent.changeText(screen.getByPlaceholderText('Digite sua resposta...'), '1,');

    expect(onChange).not.toHaveBeenCalledWith(Number.NaN);
  });

  // O que está na tela é o que o aluno digitou, não o que o store guardou. Sem
  // isso a vírgula desaparece no instante em que é digitada, porque o store
  // devolve o número já convertido — e digitar decimal fica impossível.
  it('mantém na tela o que o aluno digitou', () => {
    const campo = () => screen.getByPlaceholderText('Digite sua resposta...');
    render(<QuestionInput question={altura} value={undefined} onChange={jest.fn()} />);

    fireEvent.changeText(campo(), '1,');

    expect(campo().props.value).toBe('1,');
  });
});

describe('QuestionInput — campo apagado', () => {
  // `Number("")` é 0, e 0 parece resposta: uma altura de 0 cm ou um peso de 0 kg
  // atravessam qualquer checagem de "respondeu?" e chegam ao consumidor como
  // medida. Apagar o que se digitou é retirar a resposta, não responder zero.
  it('não registra zero quando o aluno apaga o que digitou', () => {
    const onChange = jest.fn();
    const campo = () => screen.getByPlaceholderText('Digite sua resposta...');
    render(<QuestionInput question={altura} value={undefined} onChange={onChange} />);

    fireEvent.changeText(campo(), '175');
    onChange.mockClear();
    fireEvent.changeText(campo(), '');

    expect(onChange).not.toHaveBeenCalledWith(0);
  });
});
