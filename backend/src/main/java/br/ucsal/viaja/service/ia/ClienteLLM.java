package br.ucsal.viaja.service.ia;

/**
 * Porta de saída para o Serviço de IA (ator externo do diagrama de casos de uso).
 * O assistente depende só desta interface, então o provedor do modelo de linguagem pode ser trocado
 * sem mexer na regra de negócio, e os testes usam uma implementação falsa.
 */
public interface ClienteLLM {

    /** Falso quando não há chave de API configurada; o assistente cai direto no roteiro padrão. */
    boolean disponivel();

    /**
     * Envia as instruções e o pedido e devolve o texto da resposta.
     *
     * @throws FalhaLLMException se o modelo não responder dentro do tempo limite, recusar ou der erro
     */
    String completar(String instrucoes, String pedido);

    class FalhaLLMException extends RuntimeException {
        public FalhaLLMException(String mensagem, Throwable causa) {
            super(mensagem, causa);
        }
    }
}
