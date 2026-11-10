package com.pocketphrases.roleplay;

import com.anthropic.client.AnthropicClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.pocketphrases.generate.AnthropicConfig;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RoleplayService {

    /** Short replies keep it cheap; headroom is for Haiku 5.5's default thinking. */
    private static final long MAX_TOKENS = 2000L;

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "es", "spansk",
            "fr", "fransk",
            "de", "tysk");

    private static final String SYSTEM_PROMPT = """
            Du er med i et rollespill der en norsk turist øver på å snakke %1$s.
            Situasjon: %2$s.
            Du spiller den lokale personen i situasjonen (f.eks. servitør, resepsjonist, sjåfør, farmasøyt) —
            velg rollen som passer best, og hold deg i rollen hele tiden.

            Regler:
            - Snakk enkelt %1$s på A1–A2-nivå. Maks 1–2 korte setninger per replikk.
            - Hvis samtalen er tom, åpner du scenen selv med en naturlig første replikk.
            - Hvis brukeren skriver på norsk eller engelsk, svar likevel på %1$s.
            - Rett bare tydelige språkfeil i brukerens siste replikk, kort og vennlig på norsk.
            - Gi alltid nøyaktig 4 svaralternativer på %1$s for hva brukeren kan svare nå (unntatt når done=true):
              nøyaktig ett er riktig — naturlig, grammatisk korrekt og passer i situasjonen. De tre andre skal være
              troverdige, men feil (f.eks. feil bøyning, feil ord, eller noe som ikke passer i situasjonen).
              Alle alternativene skal være omtrent like lange og på samme nivå, så det riktige ikke skiller seg ut.
            - Før samtalen mot en naturlig slutt etter noen utvekslinger.
            %3$s
            """;

    private static final String WRAP_UP = "- Dette er siste replikk: avslutt samtalen høflig nå og sett done=true.";

    private final AnthropicClient client;

    public RoleplayService(AnthropicClient client) {
        this.client = client;
    }

    public RoleplayTurn nextTurn(String language, String scenario, List<RoleplayRequest.Message> history, boolean lastTurn) {
        String system = SYSTEM_PROMPT.formatted(LANGUAGE_NAMES.get(language), scenario, lastTurn ? WRAP_UP : "");

        StructuredMessageCreateParams.Builder<RoleplayTurn> builder = MessageCreateParams.builder()
                .model(AnthropicConfig.MODEL)
                .maxTokens(MAX_TOKENS)
                .system(system)
                .outputConfig(RoleplayTurn.class);

        // The conversation must open with a user message, so a fixed one starts
        // the scene; the model's opening line is then history[0].
        builder.addUserMessage("(Start rollespillet.)");
        for (RoleplayRequest.Message m : history) {
            if (m.role() == RoleplayRequest.Role.user) {
                builder.addUserMessage(m.text());
            } else {
                builder.addAssistantMessage(m.text());
            }
        }

        return client.messages().create(builder.build()).content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Tomt svar fra Anthropic"))
                .withExactlyOneCorrect();
    }
}
