package br.com.renova.guia.ortho

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * O estado da consulta guiada: o que foi marcado e o passo aberto. Vive
 * enquanto o app vive (girar a tela ou trocar de aba não perde o exame);
 * "Nova consulta" limpa.
 */
class ConsultViewModel : ViewModel() {
    private val _answers = MutableStateFlow(ConsultAnswers())
    val answers: StateFlow<ConsultAnswers> = _answers.asStateFlow()

    private val _step = MutableStateFlow(ConsultStep.REGIAO)
    val step: StateFlow<ConsultStep> = _step.asStateFlow()

    fun goTo(step: ConsultStep) {
        _step.value = step
    }

    fun reset() {
        _answers.value = ConsultAnswers()
        _step.value = ConsultStep.REGIAO
    }

    /** Abrir a consulta já num tópico ("Atender com este roteiro"). */
    fun startAt(slug: String, regionKey: String?) {
        if (_answers.value.topic == slug) {
            _step.value = ConsultStep.ROTEIRO
            return
        }
        _answers.value = ConsultAnswers(region = regionKey, trauma = false, topic = slug)
        _step.value = ConsultStep.ROTEIRO
    }

    fun pickRegion(key: String) {
        _answers.value = ConsultAnswers(region = key)
        _step.value = ConsultStep.ALARME
    }

    fun setTrauma(trauma: Boolean) = _answers.update { it.copy(trauma = trauma) }

    fun toggleAlarm(key: String) = _answers.update { it.copy(alarm = if (key in it.alarm) it.alarm - key else it.alarm + key) }

    fun pickTopic(slug: String) {
        _answers.update { it.copy(topic = slug, ask = emptySet(), askNote = "", exam = emptyMap(), topicAlarm = emptySet(), rx = emptySet(), leave = "") }
        _step.value = ConsultStep.ROTEIRO
    }

    fun toggleAsk(i: Int) = _answers.update { it.copy(ask = if (i in it.ask) it.ask - i else it.ask + i) }
    fun setAskNote(text: String) = _answers.update { it.copy(askNote = text) }
    fun setExam(i: Int, result: ExamResult) = _answers.update { it.copy(exam = it.exam + (i to result)) }
    fun toggleTopicAlarm(i: Int) = _answers.update { it.copy(topicAlarm = if (i in it.topicAlarm) it.topicAlarm - i else it.topicAlarm + i) }
    fun toggleRx(i: Int) = _answers.update { it.copy(rx = if (i in it.rx) it.rx - i else it.rx + i) }
    fun setLeave(text: String) = _answers.update { it.copy(leave = text) }

    /** Até onde a barra de passos deixa voltar e avançar. */
    fun reached(step: ConsultStep): Boolean {
        val a = _answers.value
        val max = OrthoConsult.stepOf(a).ordinal + (if (a.topic != null) 1 else 0)
        return step.ordinal <= max
    }
}
