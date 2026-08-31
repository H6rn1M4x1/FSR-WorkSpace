const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const messyPart = `              document.body
            )}
        </div>
      </div>
    </header>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}`;

const cleanPart = `              document.body
            )}
        </div>
      </div>
    </header>
  );
}`;

content = content.replace(messyPart, cleanPart);
fs.writeFileSync('src/components/Header.tsx', content);
