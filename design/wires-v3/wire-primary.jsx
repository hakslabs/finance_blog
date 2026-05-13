// WirePrimary — single artboard that wraps all 7 AppBar-reachable screens.
// Clicking a tab in the top AppBar switches the visible screen (NavContext).
function WirePrimary({ initial = 'home' }) {
  const [active, setActive] = React.useState(initial);

  const screens = {
    home: <WireHome />,
    analysis: <WireAnalysis />,
    screener: <WireScreener />,
    masters: <WireMasters />,
    reports: <WireReports />,
    learn: <WireLearn />,
    portfolio: <WirePortfolio />,
  };

  return (
    <NavContext.Provider value={{ active, setActive }}>
      {screens[active] || screens.home}
    </NavContext.Provider>
  );
}

Object.assign(window, { WirePrimary });
