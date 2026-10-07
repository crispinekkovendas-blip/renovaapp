/**
 * Qualquer outra URL: o pop-up some. Sem isto, numa navegação sem recarregar
 * (Link, router.push), o slot @modal mantém o último pop-up aberto — o
 * compositor continuaria por cima da ficha depois de "Imprimir todos".
 */
export default function NoModal() {
  return null;
}
