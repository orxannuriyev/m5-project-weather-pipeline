# Day 7 — Statistical Analysis & Feature Selection

## Context

Yesterday's EDA surfaced interesting patterns and questions. Today you will move from *observation* to *inference*: formulate and test statistical hypotheses, explore correlations between features, and select the feature set for tomorrow's prediction model. This day combines hypothesis testing and correlation analysis — focus on what your data actually supports.

## Today's Objectives

- Formulate and test at least 1 statistical hypothesis based on your EDA findings
- Compute and visualise correlation structures across weather features
- Select and document your prediction target and candidate feature set
- (Optional) Conduct deeper analyses if time permits: VIF, ANOVA, multiple testing corrections

## Tasks

### Task 1 — Hypothesis Testing

Based on your Day 6 findings, formulate **at least one testable hypothesis**. For each, specify:

- **H₀ (null hypothesis)**: The default "no effect" claim
- **H₁ (alternative hypothesis)**: What you suspect is true
- **Test you will use**: t-test, Welch's t-test, Mann-Whitney U, chi-square, ANOVA, etc.
- **Why this test**: Justify based on data type, distribution assumptions, and sample size

**Example hypotheses** (create your own based on your data):

| # | Hypothesis | Test |
|---|-----------|------|
| 1 | Mean summer temperature in City A has increased between 2019–2021 and 2022–2024 | Welch's two-sample t-test |
| 2 | The proportion of "dry days" (precipitation = 0) is different in City A vs City B | Chi-square test of independence |
| 3 | Mean daily temperature range is different across all four seasons | One-way ANOVA |

Before running each test, verify its assumptions (normality, equal variances, independence) and document them. After running the test, report the p-value, test statistic, and interpret the result in plain language.

> **Want to go further?** Test additional hypotheses, compute effect sizes (Cohen's d, Cramer's V), and apply Bonferroni or Benjamini-Hochberg correction for multiple comparisons.

### Task 2 — Correlation Analysis

In `notebooks/day_07_statistical_analysis.ipynb`:

1. **Pearson correlation matrix**: Compute for all numerical features for one city. Display as a heatmap.
2. **Spearman rank correlation** (optional): Compare to Pearson. Where do they differ?
3. **Identify redundant features**: Flag pairs with correlation > 0.85.

> **Want to go further?** Compute lagged correlations (ACF), cross-city correlations, or Variance Inflation Factor (VIF) to detect multicollinearity.

### Task 3 — Feature Selection for Prediction

Based on your analysis, document:

1. **Prediction target**: What you will predict tomorrow (e.g., next-day max temperature, rain probability)
2. **Selected features**: Which features you will use and why
3. **Dropped features**: Which features you removed and why (high correlation, low signal, etc.)

A simple feature selection table is helpful:

| Feature | Keep? | Reason |
|---------|-------|--------|
| temperature_max_lag1 | Yes | Strong autocorrelation |
| rolling_temp_7d | No | Highly correlated with rolling_temp_30d |
| season_encoded | Yes | Significant seasonal effect |
| ... | ... | ... |

### Task 4 (Optional) — Advanced Analyses

If your team has made strong progress, explore any of these:

- **Group comparisons (ANOVA)**: Is mean temperature different across seasons? Across cities? Use Tukey's HSD for post-hoc analysis.
- **Effect sizes**: Report Cohen's d, eta-squared, or Cramer's V alongside your hypothesis tests.
- **Autocorrelation discussion**: Weather on day *t* is correlated with day *t-1*. How does this affect your tests?

## Deliverable

Push your work and submit a Pull Request containing:

- [x] `notebooks/day_07_statistical_analysis.ipynb` with at least 1 hypothesis test and correlation analysis
- [x] Assumption checks for your hypothesis test(s)
- [x] Correlation heatmap
- [x] Feature selection report with prediction target identified
- [ ] (Optional) Additional tests, VIF, ANOVA, effect sizes

## Resources

- [scipy.stats documentation](https://docs.scipy.org/doc/scipy/reference/stats.html)
- [Cohen's d](https://en.wikipedia.org/wiki/Effect_size#Cohen's_d)
- [statsmodels VIF](https://www.statsmodels.org/stable/generated/statsmodels.stats.outliers_influence.variance_inflation_factor.html)
- [pandas autocorrelation](https://pandas.pydata.org/docs/reference/api/pandas.plotting.autocorrelation_plot.html)
