const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs-extra");
const path = require("path");

const translations = {
  en: {
    ignoring: (issueNum, label) => `Skipping issue #${issueNum} because it is labeled as "${label}".`,
    votesTitle: "### 📊 Vote summary for this issue\n\n",
    votesBody: (up, down, total) => `👍: ${up}\n\n👎: ${down}\n\nTotal: ${total}`,
    rankingTitle: "### 📊 Current issue ranking by votes\n\n",
    rankingHeader: "| # | Issue | 👍 | 👎 | Total |\n|---|-------|----|----|-----|\n",
    newRankingTitle: "📊 Issue Vote Ranking",
    newRankingBody: "This issue is automatically updated with the ranking of the most voted issues using 👍 and 👎 reactions.\n\n🗳 **Vote using 👍 or 👎 on this opening comment.**",
    successCreate: (issueNum) => `Created new ranking issue (#${issueNum}).`,
    successUpdate: "Ranking issue updated successfully.",
    error: "An error occurred:"
  },
  es: {
    ignoring: (issueNum, label) => `Se omite el issue #${issueNum} porque tiene la etiqueta "${label}".`,
    votesTitle: "### 📊 Resumen de votos para este issue\n\n",
    votesBody: (up, down, total) => `👍: ${up}\n\n👎: ${down}\n\nTotal: ${total}`,
    rankingTitle: "### 📊 Ranking actual de issues por votos\n\n",
    rankingHeader: "| # | Issue | 👍 | 👎 | Total |\n|---|--------|----|----|------|\n",
    newRankingTitle: "📊 Ranking de votos por issue",
    newRankingBody: "Este issue se actualiza automáticamente con el ranking de los issues más votados utilizando las reacciones 👍 y 👎.\n\n🗳 **Vota usando 👍 o 👎 en este comentario de apertura.**",
    successCreate: (issueNum) => `Se creó el issue de ranking (#${issueNum}).`,
    successUpdate: "El issue de ranking se actualizó correctamente.",
    error: "Ocurrió un error:"
  }
};

const language = core.getInput("language") || "en";
const t = translations[language] || translations.es;

(async () => {
  try {
    const token = core.getInput("token");
    let rankingIssueNumber = parseInt(core.getInput("ranking_issue_number"), 10);
    const ignoreLabel = core.getInput("ignore_label") || "ignore-issue";
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    const votesPath = path.join(".votes", "votes.json");
    await fs.ensureDir(".votes");

    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: "open",
      per_page: 100
    });

    const voteData = {};
    
    for (const issue of issues) {
      if (issue.pull_request) continue;

      if (issue.labels.some(label => label.name.toLowerCase() === ignoreLabel.toLowerCase())) {
        console.log(t.ignoring(issue.number, ignoreLabel));
        continue;
      }

      // 1. Obtener los votos directamente del objeto 'reactions' del issue
      const up = issue.reactions?.['+1'] || 0;
      const down = issue.reactions?.['-1'] || 0;

      // 2. Guardar los datos de votación para el ranking final
      voteData[issue.number] = {
        title: issue.title,
        upvotes: up,
        downvotes: down,
        total: up - down,
      };

      // 3. Buscar el comentario del bot para actualizarlo
      const issueComments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number: issue.number,
      });

      const existingComment = issueComments.find(c =>
        c.body.includes("<!-- ISSUE-VOTE-COMMENT -->")
      );

      const individualBody = `<!-- ISSUE-VOTE-COMMENT -->\n${t.votesTitle}${t.votesBody(up, down, up - down)}`;

      // 4. Actualizar o crear el comentario con los votos correctos
      if (existingComment) {
        // Solo actualizar si el contenido ha cambiado para evitar llamadas innecesarias
        if (existingComment.body !== individualBody) {
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existingComment.id,
                body: individualBody,
            });
        }
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issue.number,
          body: individualBody,
        });
      }
    }

    await fs.writeJson(votesPath, voteData, { spaces: 2 });

    const sorted = Object.entries(voteData)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    let body = `<!-- VOTE-RANKING-COMMENT -->\n${t.rankingTitle}${t.rankingHeader}`;

    for (const [num, data] of sorted) {
      body += `| [#${num}](https://github.com/${owner}/${repo}/issues/${num}) | ${data.title} | ${data.upvotes} | ${data.downvotes} | ${data.total} |\n`;
    }

    let issueExists = true;
    try {
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: rankingIssueNumber
      });
    } catch (err) {
      if (err.status === 404 || err.status === 410) {  
        issueExists = false;
      } else {
        throw err;
      }
    }

    if (!issueExists) {
      const newIssue = await octokit.rest.issues.create({
        owner,
        repo,
        title: t.newRankingTitle,
        body: t.newRankingBody
      });
      rankingIssueNumber = newIssue.data.number;
      console.log(t.successCreate(rankingIssueNumber));
    }

    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: rankingIssueNumber
    });

    const botComment = comments.find(c =>
      c.body.includes("<!-- VOTE-RANKING-COMMENT -->")
    );

    if (botComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: botComment.id,
        body
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: rankingIssueNumber,
        body
      });
    }

    console.log(t.successUpdate);

  } catch (err) {
    console.error(`${t.error}`, err);
    core.setFailed(err.message);
  }
})();