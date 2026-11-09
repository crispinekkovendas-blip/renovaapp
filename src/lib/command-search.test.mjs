import assert from "node:assert/strict";
import { test } from "node:test";
import { commandsFor, matchCommands } from "./command-search.ts";

const NAV = [
  {
    href: "/agenda",
    label: "Agenda",
    tabs: [
      { href: "/agenda", label: "Dia" },
      { href: "/agenda/semana", label: "Semana" },
    ],
  },
  { href: "/relatorios", label: "Relatórios" },
];

test("a recepção não recebe a ação de receita", () => {
  const hrefs = commandsFor("recepcao", NAV).map((c) => c.href);
  assert.ok(!hrefs.includes("/receituario"));
  assert.ok(hrefs.includes("/agenda/novo"));
  assert.ok(commandsFor("profissional", NAV).some((c) => c.href === "/receituario"));
});

test("a aba igual à seção não se repete e as outras levam o nome da seção", () => {
  const commands = commandsFor("admin", NAV);
  assert.equal(commands.filter((c) => c.href === "/agenda").length, 1);
  assert.equal(commands.find((c) => c.href === "/agenda/semana").label, "Agenda › Semana");
});

test("busca sem acento, por sinônimo e com várias palavras", () => {
  const commands = commandsFor("admin", NAV);
  assert.equal(matchCommands("relatorios", commands)[0].href, "/relatorios");
  assert.equal(matchCommands("prescrever", commands)[0].href, "/receituario");
  assert.equal(matchCommands("agenda semana", commands)[0].href, "/agenda/semana");
  assert.deepEqual(matchCommands("xyzzy", commands), []);
});

test("quem começa com o termo vem primeiro", () => {
  const commands = [
    { href: "/a", label: "Nova agenda" },
    { href: "/b", label: "Agenda" },
  ];
  assert.equal(matchCommands("agenda", commands)[0].href, "/b");
});

test("sem termo mostra os primeiros comandos, até o limite", () => {
  const commands = commandsFor("admin", NAV);
  assert.equal(matchCommands("  ", commands, 2).length, 2);
  assert.equal(matchCommands("", commands)[0].href, "/agenda/novo");
});
