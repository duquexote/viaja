package br.ucsal.viaja.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.ucsal.viaja.domain.TipoHospedagem;
import br.ucsal.viaja.domain.TipoTransporte;
import br.ucsal.viaja.dto.AvaliacaoDTO;
import br.ucsal.viaja.dto.OfertaDTO;
import br.ucsal.viaja.dto.Requisicoes.Opcoes;
import br.ucsal.viaja.service.AvaliacaoService;
import br.ucsal.viaja.service.OfertaService;
import lombok.RequiredArgsConstructor;

/** Buscas públicas de passagens, hospedagens e passeios, comparação e detalhes (RF-04 a RF-07). */
@RestController
@RequestMapping("/api/ofertas")
@RequiredArgsConstructor
public class OfertaController {

    private final OfertaService ofertaService;
    private final AvaliacaoService avaliacaoService;

    @GetMapping("/opcoes")
    public Opcoes opcoes() {
        return ofertaService.opcoes();
    }

    @GetMapping("/passagens")
    public List<OfertaDTO> passagens(@RequestParam(required = false) String origem,
                                     @RequestParam(required = false) String destino,
                                     @RequestParam(required = false) LocalDate data,
                                     @RequestParam(required = false) Integer passageiros,
                                     @RequestParam(required = false) BigDecimal precoMax,
                                     @RequestParam(required = false) TipoTransporte tipo,
                                     @RequestParam(required = false) String horario,
                                     @RequestParam(required = false) String ordenar) {
        return ofertaService.buscarPassagens(origem, destino, data, passageiros, precoMax, tipo, horario, ordenar);
    }

    @GetMapping("/hospedagens")
    public List<OfertaDTO> hospedagens(@RequestParam(required = false) String cidade,
                                       @RequestParam(required = false) LocalDate checkin,
                                       @RequestParam(required = false) LocalDate checkout,
                                       @RequestParam(required = false) Integer hospedes,
                                       @RequestParam(required = false) BigDecimal precoMax,
                                       @RequestParam(required = false) TipoHospedagem tipo,
                                       @RequestParam(required = false) Double notaMin,
                                       @RequestParam(required = false) List<String> comodidades,
                                       @RequestParam(required = false) String ordenar) {
        return ofertaService.buscarHospedagens(cidade, checkin, checkout, hospedes, precoMax, tipo, notaMin,
                comodidades, ordenar);
    }

    @GetMapping("/passeios")
    public List<OfertaDTO> passeios(@RequestParam(required = false) String cidade,
                                    @RequestParam(required = false) LocalDate data,
                                    @RequestParam(required = false) LocalDate dataFim,
                                    @RequestParam(required = false) BigDecimal precoMax,
                                    @RequestParam(required = false) String categoria,
                                    @RequestParam(required = false) String ordenar) {
        return ofertaService.buscarPasseios(cidade, data, dataFim, precoMax, categoria, ordenar);
    }

    @GetMapping("/comparar")
    public List<OfertaDTO> comparar(@RequestParam List<Long> ids) {
        return ofertaService.comparar(ids);
    }

    @GetMapping("/{id:\\d+}")
    public OfertaDTO detalhar(@PathVariable Long id) {
        return ofertaService.detalhar(id);
    }

    @GetMapping("/{id:\\d+}/avaliacoes")
    public List<AvaliacaoDTO> avaliacoes(@PathVariable Long id) {
        return avaliacaoService.listarDaOferta(id);
    }
}
