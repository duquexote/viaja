package br.ucsal.viaja.domain;

/** Ciclo de vida da reserva, igual ao BPMN: só o aceite do fornecedor confirma. */
public enum StatusReserva { SOLICITADA, CONFIRMADA, RECUSADA, EXPIRADA, CANCELADA }
