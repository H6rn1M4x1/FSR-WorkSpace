const html = `
          if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
              execCommand("outdent");
            } else {
              execCommand("indent");
            }
            return;
          }
`;
